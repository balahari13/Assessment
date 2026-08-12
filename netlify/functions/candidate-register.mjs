import { randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    generateReferenceId
} from './lib/shared.mjs';
import { hashPassword } from './lib/password.mjs';
import { writeAudit } from './lib/audit.mjs';

const CANDIDATE_INDEX = 'candidate-index';
const MAX_BYTES = 1.5 * 1024 * 1024;

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
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
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const username = String(body.username || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = String(body.role || 'General application').trim().slice(0, 120);
        const ALLOWED_SOURCES = ['Job portal', 'LinkedIn', 'Friends', 'Word of mouth', 'Employee referral'];
        const referredBy = String(body.referredBy || '').trim();
        const referredDetail = String(body.referredDetail || '').trim().slice(0, 120);
        const notes = String(body.notes || '').trim().slice(0, 1000);
        const fileName = String(body.fileName || '').trim().slice(0, 180);
        const fileType = String(body.fileType || 'application/pdf').trim().slice(0, 80);
        const fileBase64 = String(body.fileBase64 || '').replace(/^data:[^;]+;base64,/, '');

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

        const store = getAssessmentStore(context);
        const existing = await store.get(candidateKey(username), { type: 'text' });
        if (existing) {
            return jsonResponse(409, { error: 'exists', message: 'That username is already taken. Choose another or sign in.' }, origin);
        }

        const { salt, passwordHash } = hashPassword(password);
        const resumeId = `resume-${Date.now()}-${username.replace(/[^a-z0-9]/g, '')}`;
        const referenceId = generateReferenceId();

        const resumeRecord = {
            id: resumeId,
            fullName,
            email,
            phone,
            role,
            referredBy,
            referredDetail,
            notes,
            fileName,
            fileType,
            fileBase64,
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
            fullName,
            email,
            phone,
            salt,
            passwordHash,
            resumeId,
            role,
            referredBy,
            referredDetail,
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
            target: email,
            meta: { referenceId, resumeId }
        });

        return jsonResponse(200, {
            success: true,
            token,
            username,
            fullName,
            email,
            phone,
            referenceId,
            message: `Account created. Your reference ID is ${referenceId}. You can start Attempt 1 now.`
        }, origin);
    } catch (err) {
        console.error('candidate-register error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};
