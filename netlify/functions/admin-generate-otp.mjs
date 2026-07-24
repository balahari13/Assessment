import { createHash, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    verifyAdminToken
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
                    message: `Your one-time code to resume the Trinitas assessment is: ${otp}. It is valid for 24 hours. Enter this OTP on the Careers page under Resume assessment.`,
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
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization');
        const valid = await verifyAdminToken(store, auth);
        if (!valid) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const body = await req.json();
        const email = normalizeEmail(body.email);
        if (!email || !email.includes('@')) {
            return jsonResponse(400, { error: 'Valid email required' });
        }

        const raw = await store.get(pauseKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, {
                error: 'not_found',
                message: 'No paused session found for this email.'
            });
        }

        const rec = JSON.parse(raw);
        if (Date.now() > Number(rec.snapshotExpiresAt || 0)) {
            await store.delete(pauseKey(email));
            return jsonResponse(410, {
                error: 'expired',
                message: 'This paused session has expired. Candidate must restart the assessment.'
            });
        }

        const otp = String(randomInt(100000, 999999));
        rec.otpHash = hashOtp(otp, email);
        rec.otpExpiresAt = Date.now() + OTP_TTL_MS;
        rec.otpGeneratedAt = new Date().toISOString();
        rec.status = 'otp_ready';
        await store.set(pauseKey(email), JSON.stringify(rec));

        const emailed = await sendOtpEmail(email, rec.fullName, otp);

        return jsonResponse(200, {
            success: true,
            email,
            otp,
            emailed,
            message: emailed
                ? `OTP generated and emailed to ${email}. Code is also shown below for admin reference.`
                : `OTP generated for ${email}. Email delivery may have failed — share this OTP with the candidate securely.`,
            expiresInHours: 24
        });
    } catch (err) {
        console.error('admin-generate-otp error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Could not generate OTP.',
            detail: err.message
        });
    }
};
