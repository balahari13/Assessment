import { createHash, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore
} from './lib/shared.mjs';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const FORM_EMAIL = 'info@trinitasnxt.in';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

function hashCode(code, username) {
    return createHash('sha256').update(`${code}:${String(username).toLowerCase()}:trinitas-verify`).digest('hex');
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
                    _subject: 'Trinitas Careers — new verification code',
                    _template: 'table',
                    _captcha: 'false',
                    name: fullName || 'Candidate',
                    email: toEmail,
                    message: `Your new Trinitas verification code is: ${code}. Valid for 24 hours. Enter it on the Careers page to activate your account.`,
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
        const username = String(body.username || '').trim().toLowerCase();
        if (!username) {
            return jsonResponse(400, { error: 'validation', message: 'Username is required.' });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'not_found', message: 'Account not found.' });
        }

        const candidate = JSON.parse(raw);
        if (candidate.emailVerified) {
            return jsonResponse(200, {
                success: true,
                alreadyVerified: true,
                message: 'Email is already verified. Please sign in.'
            });
        }

        const code = String(randomInt(100000, 999999));
        candidate.verifyCodeHash = hashCode(code, username);
        candidate.verifyExpiresAt = Date.now() + VERIFY_TTL_MS;
        await store.set(candidateKey(username), JSON.stringify(candidate));

        const emailed = await sendVerifyEmail(candidate.email, candidate.fullName, code);

        return jsonResponse(200, {
            success: true,
            emailed,
            email: candidate.email,
            message: emailed
                ? `A new code was sent to ${candidate.email}.`
                : `Code regenerated. If email does not arrive, contact info@trinitasnxt.in with username ${username}.`
        });
    } catch (err) {
        console.error('candidate-resend-verify error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
