import { createHash, randomBytes, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

const CANDIDATE_INDEX = 'candidate-index';
const MAX_BYTES = 1.5 * 1024 * 1024;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const FORM_EMAIL = 'info@trinitasnxt.in';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

function hashPassword(password, salt) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function hashCode(code, username) {
    return createHash('sha256').update(`${code}:${String(username).toLowerCase()}:trinitas-verify`).digest('hex');
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

async function sendVerifyEmail(toEmail, fullName, code) {
    const targets = [toEmail, FORM_EMAIL];
    let anyOk = false;
    for (const target of targets) {
        try {
            const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    _subject: 'Trinitas Careers — verify your email',
                    _template: 'table',
                    _captcha: 'false',
                    name: fullName || 'Candidate',
                    email: toEmail,
                    message: `Your Trinitas careers verification code is: ${code}. It is valid for 24 hours. Enter this code on the Careers page to activate your account and start Attempt 1.`,
                    verification_code: code,
                    candidate_email: toEmail
                })
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.success !== false) anyOk = true;
        } catch {
            /* try next */
        }
    }
    return anyOk;
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = await req.json();
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const username = String(body.username || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = String(body.role || 'General application').trim().slice(0, 120);
        const notes = String(body.notes || '').trim().slice(0, 1000);
        const fileName = String(body.fileName || '').trim().slice(0, 180);
        const fileType = String(body.fileType || 'application/pdf').trim().slice(0, 80);
        const fileBase64 = String(body.fileBase64 || '').replace(/^data:[^;]+;base64,/, '');

        if (!fullName || !email || !email.includes('@') || !phone) {
            return jsonResponse(400, { error: 'validation', message: 'Name, email, and phone are required.' });
        }
        const userErr = validateUsername(username);
        if (userErr) return jsonResponse(400, { error: 'validation', message: userErr });
        const passErr = validatePassword(password);
        if (passErr) return jsonResponse(400, { error: 'validation', message: passErr });
        if (!fileBase64 || fileBase64.length < 20) {
            return jsonResponse(400, { error: 'validation', message: 'Please attach your resume (PDF or Word).' });
        }
        const approxBytes = Math.floor((fileBase64.length * 3) / 4);
        if (approxBytes > MAX_BYTES) {
            return jsonResponse(400, { error: 'validation', message: 'Resume must be under 1.5 MB.' });
        }
        if (!/\.(pdf|doc|docx)$/i.test(fileName)) {
            return jsonResponse(400, { error: 'validation', message: 'Only PDF or Word resumes are accepted.' });
        }

        const store = getAssessmentStore(context);
        const existing = await store.get(candidateKey(username), { type: 'text' });
        if (existing) {
            return jsonResponse(409, { error: 'exists', message: 'That username is already taken. Choose another or sign in.' });
        }

        const salt = randomBytes(12).toString('hex');
        const passwordHash = hashPassword(password, salt);
        const resumeId = `resume-${Date.now()}-${username.replace(/[^a-z0-9]/g, '')}`;
        const verifyCode = String(randomInt(100000, 999999));

        const resumeRecord = {
            id: resumeId,
            fullName,
            email,
            phone,
            role,
            notes,
            fileName,
            fileType,
            fileBase64,
            username,
            submittedAt: new Date().toISOString()
        };
        await store.set(`resume:${resumeId}`, JSON.stringify(resumeRecord));

        const resumeIdxRaw = await store.get('resume-index', { type: 'text' });
        const resumeIndex = resumeIdxRaw ? JSON.parse(resumeIdxRaw) : [];
        resumeIndex.unshift(resumeId);
        await store.set('resume-index', JSON.stringify(resumeIndex.slice(0, 500)));

        const candidate = {
            username,
            fullName,
            email,
            phone,
            salt,
            passwordHash,
            resumeId,
            role,
            emailVerified: false,
            verifyCodeHash: hashCode(verifyCode, username),
            verifyExpiresAt: Date.now() + VERIFY_TTL_MS,
            createdAt: new Date().toISOString()
        };
        await store.set(candidateKey(username), JSON.stringify(candidate));

        const idxRaw = await store.get(CANDIDATE_INDEX, { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(username)) {
            index.push(username);
            await store.set(CANDIDATE_INDEX, JSON.stringify(index));
        }

        const emailed = await sendVerifyEmail(email, fullName, verifyCode);

        return jsonResponse(200, {
            success: true,
            needsVerification: true,
            username,
            fullName,
            email,
            phone,
            emailed,
            message: emailed
                ? `Account created and resume submitted. We sent a 6-digit verification code to ${email}. Enter it below to activate your account.`
                : `Account created and resume submitted. Check your email for a verification code (and spam folder). If it does not arrive, use Resend code or contact info@trinitasnxt.in.`
        });
    } catch (err) {
        console.error('candidate-register error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
