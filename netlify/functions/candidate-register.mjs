import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    generateReferenceId
} from './lib/shared.mjs';
import { hashPassword } from './lib/password.mjs';
import { writeAudit } from './lib/audit.mjs';
import { sendTransactionalEmail } from './lib/send-mail.mjs';

const CANDIDATE_INDEX = 'candidate-index';
const MAX_BYTES = 1.5 * 1024 * 1024;
const OTP_TTL_MS = 10 * 60 * 1000;
const ALLOWED_SOURCES = ['Job portal', 'LinkedIn', 'Friends', 'Word of mouth', 'Employee referral'];

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

function pendingKey(email) {
    return `reg-pending:${normalizeEmail(email)}`;
}

function captchaKey(id) {
    return `reg-captcha:${id}`;
}

function hashOtp(otp, email) {
    return createHash('sha256').update(`${otp}:${normalizeEmail(email)}:trinitas-register`).digest('hex');
}

function hashCaptcha(id, answer) {
    return createHash('sha256').update(`${id}:${String(answer).toUpperCase()}:trinitas-captcha`).digest('hex');
}

function safeEqualHex(a, b) {
    try {
        const ba = Buffer.from(String(a), 'hex');
        const bb = Buffer.from(String(b), 'hex');
        if (ba.length !== bb.length) return false;
        return timingSafeEqual(ba, bb);
    } catch {
        return false;
    }
}

function validatePassword(password) {
    const p = String(password || '');
    if (p.length < 12) return 'Password must be at least 12 characters.';
    if (!/\d/.test(p)) return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(p)) return 'Password must include at least one special character.';
    return null;
}

function validateUsername(username) {
    const u = String(username || '').trim().toLowerCase();
    if (u.length < 4 || u.length > 32) return 'Username must be 4–32 characters.';
    if (!/^[a-z0-9._-]+$/.test(u)) return 'Username may only use letters, numbers, dots, underscores, and hyphens.';
    return null;
}

async function emailTaken(store, email, exceptUsername) {
    const idxRaw = await store.get(CANDIDATE_INDEX, { type: 'text' });
    const index = idxRaw ? JSON.parse(idxRaw) : [];
    for (const username of index) {
        if (exceptUsername && username === exceptUsername) continue;
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) continue;
        try {
            const rec = JSON.parse(raw);
            if (normalizeEmail(rec.email) === email) return true;
        } catch {
            /* skip */
        }
    }
    return false;
}

async function consumeCaptcha(store, id, answer) {
    if (!id || !answer) return false;
    const raw = await store.get(captchaKey(id), { type: 'text' });
    if (!raw) return false;
    let rec;
    try {
        rec = JSON.parse(raw);
    } catch {
        return false;
    }
    await store.delete(captchaKey(id));
    if (Date.now() > Number(rec.expiresAt || 0)) return false;
    return safeEqualHex(rec.hash, hashCaptcha(id, answer));
}

async function sendRegisterOtpEmail(toEmail, fullName, otp, origin) {
    const text = [
        `Hello ${fullName || ''},`.trim(),
        '',
        `Your Trinitas registration code is: ${otp}`,
        '',
        'Enter this 6-digit code on the Careers page to finish creating your account.',
        'The code expires in 10 minutes.',
        '',
        'If you did not start a registration, you can ignore this email.',
        '',
        '— Trinitas NextGen Business Solutions',
        'https://trinitasnxt.in/careers.html'
    ].join('\n');
    const result = await sendTransactionalEmail({
        to: toEmail,
        fullName,
        subject: `${otp} is your Trinitas verification code`,
        text,
        origin
    });
    return result.ok;
}

async function createAccount(store, pending) {
    const username = pending.username;
    const resumeId = `resume-${Date.now()}-${username.replace(/[^a-z0-9]/g, '')}`;
    const referenceId = generateReferenceId();

    const resumeRecord = {
        id: resumeId,
        fullName: pending.fullName,
        email: pending.email,
        phone: pending.phone,
        role: pending.role,
        referredBy: pending.referredBy,
        referredDetail: pending.referredDetail,
        notes: pending.notes,
        fileName: pending.fileName,
        fileType: pending.fileType,
        fileBase64: pending.fileBase64,
        username,
        referenceId,
        submittedAt: new Date().toISOString()
    };
    await store.set(`resume:${resumeId}`, JSON.stringify(resumeRecord));

    const resumeIdxRaw = await store.get('resume-index', { type: 'text' });
    const resumeIndex = resumeIdxRaw ? JSON.parse(resumeIdxRaw) : [];
    resumeIndex.unshift(resumeId);
    await store.set('resume-index', JSON.stringify(resumeIndex.slice(0, 500)));

    const candidate = {
        username,
        fullName: pending.fullName,
        email: pending.email,
        phone: pending.phone,
        salt: pending.salt,
        passwordHash: pending.passwordHash,
        resumeId,
        role: pending.role,
        referredBy: pending.referredBy,
        referredDetail: pending.referredDetail,
        referenceId,
        passwordResetEnabled: false,
        createdAt: new Date().toISOString()
    };
    await store.set(candidateKey(username), JSON.stringify(candidate));

    const idxRaw = await store.get(CANDIDATE_INDEX, { type: 'text' });
    const index = idxRaw ? JSON.parse(idxRaw) : [];
    if (!index.includes(username)) {
        index.push(username);
        await store.set(CANDIDATE_INDEX, JSON.stringify(index));
    }

    const token = randomBytes(24).toString('hex');
    await store.set(`candidate-session:${token}`, JSON.stringify({
        username: candidate.username,
        email: candidate.email,
        fullName: candidate.fullName,
        phone: candidate.phone,
        referenceId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));

    await writeAudit(store, {
        actor: username,
        role: 'candidate',
        action: 'candidate_register',
        target: candidate.email,
        meta: { referenceId, resumeId }
    });

    return { token, username, fullName: candidate.fullName, email: candidate.email, phone: candidate.phone, referenceId };
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const body = await req.json();
        const step = String(body.step || 'send-otp');
        const store = getAssessmentStore(context);

        if (step === 'complete') {
            const email = normalizeEmail(body.email);
            const otp = String(body.otp || '').trim();
            if (!email || !/^\d{6}$/.test(otp)) {
                return jsonResponse(400, { error: 'validation', message: 'Enter the 6-digit code sent to your email.' }, origin);
            }
            const pendingRaw = await store.get(pendingKey(email), { type: 'text' });
            if (!pendingRaw) {
                return jsonResponse(400, { error: 'otp_expired', message: 'That code has expired. Request a new one and try again.' }, origin);
            }
            const pending = JSON.parse(pendingRaw);
            if (Date.now() > Number(pending.otpExpiresAt || 0)) {
                await store.delete(pendingKey(email));
                return jsonResponse(400, { error: 'otp_expired', message: 'That code has expired. Request a new one and try again.' }, origin);
            }
            if (!safeEqualHex(pending.otpHash, hashOtp(otp, email))) {
                return jsonResponse(400, { error: 'invalid_otp', message: 'That code is not correct. Check the email and try again.' }, origin);
            }
            const existing = await store.get(candidateKey(pending.username), { type: 'text' });
            if (existing) {
                await store.delete(pendingKey(email));
                return jsonResponse(409, { error: 'exists', message: 'That username is already taken. Choose another or sign in.' }, origin);
            }
            const created = await createAccount(store, pending);
            await store.delete(pendingKey(email));
            return jsonResponse(200, {
                success: true,
                ...created,
                message: `Account created. Your reference ID is ${created.referenceId}. You can start Attempt 1 now.`
            }, origin);
        }

        if (step === 'resend-otp') {
            const email = normalizeEmail(body.email);
            if (!email || !email.includes('@')) {
                return jsonResponse(400, { error: 'validation', message: 'Email is required to resend the code.' }, origin);
            }
            const pendingRaw = await store.get(pendingKey(email), { type: 'text' });
            if (!pendingRaw) {
                return jsonResponse(400, { error: 'otp_expired', message: 'No pending registration found. Start again from the form.' }, origin);
            }
            const pending = JSON.parse(pendingRaw);
            const lastSent = Number(pending.lastSentAt || pending.createdAt || 0);
            const lastMs = Number.isFinite(lastSent) ? lastSent : Date.parse(pending.createdAt) || 0;
            if (Date.now() - lastMs < 45 * 1000) {
                return jsonResponse(429, {
                    error: 'too_soon',
                    message: 'Please wait about a minute before requesting another code.'
                }, origin);
            }
            const resends = Number(pending.resendCount || 0);
            if (resends >= 8) {
                return jsonResponse(429, {
                    error: 'too_many',
                    message: 'Too many codes requested. Wait a few minutes or start registration again.'
                }, origin);
            }
            const otp = String(randomInt(100000, 999999));
            pending.otpHash = hashOtp(otp, email);
            pending.otpExpiresAt = Date.now() + OTP_TTL_MS;
            pending.lastSentAt = Date.now();
            pending.resendCount = resends + 1;
            await store.set(pendingKey(email), JSON.stringify(pending));
            sendRegisterOtpEmail(email, pending.fullName, otp, origin).catch(() => {});
            return jsonResponse(200, {
                success: true,
                step: 'otp_sent',
                email,
                mailOtp: otp,
                message: `Enter the 6-digit code sent to ${email}. Check inbox and spam.`
            }, origin);
        }

        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const username = String(body.username || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = String(body.role || 'General application').trim().slice(0, 120);
        const referredBy = String(body.referredBy || '').trim();
        const referredDetail = String(body.referredDetail || '').trim().slice(0, 120);
        const notes = String(body.notes || '').trim().slice(0, 1000);
        const fileName = String(body.fileName || '').trim().slice(0, 180);
        const fileType = String(body.fileType || 'application/pdf').trim().slice(0, 80);
        const fileBase64 = String(body.fileBase64 || '').replace(/^data:[^;]+;base64,/, '');
        const captchaId = String(body.captchaId || '').trim();
        const captchaAnswer = String(body.captchaAnswer || '').trim();

        if (!fullName || !email || !email.includes('@') || !phone) {
            return jsonResponse(400, { error: 'validation', message: 'Name, email, and phone are required.' }, origin);
        }
        const userErr = validateUsername(username);
        if (userErr) return jsonResponse(400, { error: 'validation', message: userErr }, origin);
        const passErr = validatePassword(password);
        if (passErr) return jsonResponse(400, { error: 'validation', message: passErr }, origin);
        if (!ALLOWED_SOURCES.includes(referredBy)) {
            return jsonResponse(400, { error: 'validation', message: 'Please select how you heard about us.' }, origin);
        }
        if (!fileBase64 || fileBase64.length < 20) {
            return jsonResponse(400, { error: 'validation', message: 'Please attach your resume (PDF or Word).' }, origin);
        }
        const approxBytes = Math.floor((fileBase64.length * 3) / 4);
        if (approxBytes > MAX_BYTES) {
            return jsonResponse(400, { error: 'validation', message: 'Resume must be under 1.5 MB.' }, origin);
        }
        if (!/\.(pdf|doc|docx)$/i.test(fileName)) {
            return jsonResponse(400, { error: 'validation', message: 'Only PDF or Word resumes are accepted.' }, origin);
        }

        const captchaOk = await consumeCaptcha(store, captchaId, captchaAnswer);
        if (!captchaOk) {
            return jsonResponse(400, { error: 'captcha', message: 'Captcha is incorrect or expired. Refresh it and try again.' }, origin);
        }

        const existing = await store.get(candidateKey(username), { type: 'text' });
        if (existing) {
            return jsonResponse(409, { error: 'exists', message: 'That username is already taken. Choose another or sign in.' }, origin);
        }
        if (await emailTaken(store, email)) {
            return jsonResponse(409, { error: 'exists', message: 'An account already exists for this email. Sign in instead.' }, origin);
        }

        const { salt, passwordHash } = hashPassword(password);
        const otp = String(randomInt(100000, 999999));
        const pending = {
            fullName,
            email,
            phone,
            username,
            salt,
            passwordHash,
            role,
            referredBy,
            referredDetail,
            notes,
            fileName,
            fileType,
            fileBase64,
            otpHash: hashOtp(otp, email),
            otpExpiresAt: Date.now() + OTP_TTL_MS,
            lastSentAt: Date.now(),
            resendCount: 0,
            createdAt: new Date().toISOString()
        };
        await store.set(pendingKey(email), JSON.stringify(pending));
        sendRegisterOtpEmail(email, fullName, otp, origin).catch(() => {});
        return jsonResponse(200, {
            success: true,
            step: 'otp_sent',
            email,
            mailOtp: otp,
            message: `Enter the 6-digit code sent to ${email}. Check inbox and spam.`
        }, origin);
    } catch (err) {
        console.error('candidate-register error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};
