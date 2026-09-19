import { createHash, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    verifyAdminToken
} from './lib/shared.mjs';
import { sendTransactionalEmail } from './lib/send-mail.mjs';

const OTP_TTL_MS = 24 * 60 * 60 * 1000;

function pauseKey(email) {
    return `pause:${normalizeEmail(email)}`;
}

function hashOtp(otp, email) {
    return createHash('sha256').update(`${otp}:${normalizeEmail(email)}:trinitas-pause`).digest('hex');
}

async function sendOtpEmail(toEmail, fullName, otp, origin) {
    const text = [
        `Hello ${fullName || ''},`.trim(),
        '',
        `Your Trinitas code to resume the assessment is: ${otp}`,
        '',
        'Enter this 6-digit code on the Careers page under Resume assessment.',
        'The code is valid for 24 hours.',
        '',
        '— Trinitas NextGen Business Solutions'
    ].join('\n');
    const result = await sendTransactionalEmail({
        to: toEmail,
        fullName,
        subject: `${otp} is your Trinitas resume-assessment code`,
        text,
        origin
    });
    return result.ok;
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

        const emailed = await sendOtpEmail(email, rec.fullName, otp, req.headers.get('origin') || '');

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
