import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore
} from './lib/shared.mjs';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

function hashCode(code, username) {
    return createHash('sha256').update(`${code}:${String(username).toLowerCase()}:trinitas-verify`).digest('hex');
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

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = await req.json();
        const username = String(body.username || '').trim().toLowerCase();
        const code = String(body.code || '').trim();

        if (!username || !/^\d{6}$/.test(code)) {
            return jsonResponse(400, { error: 'validation', message: 'Username and 6-digit code are required.' });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'not_found', message: 'Account not found. Check your username.' });
        }

        const candidate = JSON.parse(raw);
        if (candidate.emailVerified) {
            const token = randomBytes(24).toString('hex');
            await store.set(`candidate-session:${token}`, JSON.stringify({
                username: candidate.username,
                email: candidate.email,
                fullName: candidate.fullName,
                phone: candidate.phone,
                emailVerified: true,
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
            }));
            return jsonResponse(200, {
                success: true,
                alreadyVerified: true,
                token,
                username: candidate.username,
                fullName: candidate.fullName,
                email: candidate.email,
                phone: candidate.phone,
                message: 'Email already verified. You are signed in.'
            });
        }

        if (!candidate.verifyCodeHash) {
            return jsonResponse(400, { error: 'no_code', message: 'No verification code on file. Use Resend code.' });
        }
        if (Date.now() > Number(candidate.verifyExpiresAt || 0)) {
            return jsonResponse(410, { error: 'expired', message: 'Verification code expired. Use Resend code.' });
        }
        if (!safeEqualHex(candidate.verifyCodeHash, hashCode(code, username))) {
            return jsonResponse(403, { error: 'invalid', message: 'Incorrect verification code.' });
        }

        candidate.emailVerified = true;
        candidate.emailVerifiedAt = new Date().toISOString();
        candidate.verifyCodeHash = null;
        candidate.verifyExpiresAt = null;
        await store.set(candidateKey(username), JSON.stringify(candidate));

        const token = randomBytes(24).toString('hex');
        await store.set(`candidate-session:${token}`, JSON.stringify({
            username: candidate.username,
            email: candidate.email,
            fullName: candidate.fullName,
            phone: candidate.phone,
            emailVerified: true,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        return jsonResponse(200, {
            success: true,
            token,
            username: candidate.username,
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone,
            message: 'Email verified. Your account is active — you can start Attempt 1.'
        });
    } catch (err) {
        console.error('candidate-verify-email error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
