import { createHash, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

const OTP_TTL_MS = 24 * 60 * 60 * 1000;
const FORM_EMAIL = 'info@trinitasnxt.in';

function pauseKey(email) {
    return `pause:${normalizeEmail(email)}`;
}

function hashOtp(otp, email) {
    return createHash('sha256').update(`${otp}:${normalizeEmail(email)}:trinitas-pause`).digest('hex');
}

async function sendOtpEmail(toEmail, fullName, otp) {
    const targets = [toEmail, FORM_EMAIL];
    let anyOk = false;
    for (const target of targets) {
        try {
            const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    _subject: `Trinitas Assessment OTP — resume your session`,
                    _template: 'table',
                    _captcha: 'false',
                    name: fullName || 'Candidate',
                    email: toEmail,
                    message: `Your one-time code to resume the Trinitas assessment is: ${otp}. It is valid for 24 hours. If you did not pause an assessment, ignore this email.`,
                    otp_code: otp,
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
        const email = normalizeEmail(body.email);
        const fullName = String(body.fullName || '').trim();
        const snapshot = body.snapshot;

        if (!email || !email.includes('@') || !snapshot || typeof snapshot !== 'object') {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Email and assessment snapshot are required to pause.'
            });
        }

        // Strip non-serializable / huge fields
        if (snapshot.state?.voice?.recordings) {
            snapshot.state.voice.recordings = (snapshot.state.voice.recordings || []).map(r => {
                if (!r) return null;
                const { url, ...rest } = r;
                return rest;
            });
        }

        const otp = String(randomInt(100000, 999999));
        const store = getAssessmentStore(context);
        const record = {
            email,
            fullName,
            otpHash: hashOtp(otp, email),
            snapshot,
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + OTP_TTL_MS
        };

        await store.set(pauseKey(email), JSON.stringify(record));
        const emailed = await sendOtpEmail(email, fullName, otp);

        return jsonResponse(200, {
            success: true,
            emailed,
            message: emailed
                ? `A 6-digit OTP was sent to ${email}. Use it on the Careers page to resume.`
                : `Session paused. If you do not receive the OTP email, contact info@trinitasnxt.in with your registered email.`,
            // Never return OTP in production responses to non-admin — only if email failed for support debugging on owner copy
            hint: emailed ? null : 'Check spam folder; recruitment inbox also received a copy when email routing allows.'
        });
    } catch (err) {
        console.error('pause-assessment error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Could not pause assessment. Please try again.',
            detail: err.message
        });
    }
};
