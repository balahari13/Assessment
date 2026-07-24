import { createHash, timingSafeEqual } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

function pauseKey(email) {
    return `pause:${normalizeEmail(email)}`;
}

function hashOtp(otp, email) {
    return createHash('sha256').update(`${otp}:${normalizeEmail(email)}:trinitas-pause`).digest('hex');
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
        const email = normalizeEmail(body.email);
        const otp = String(body.otp || '').trim();

        if (!email || !email.includes('@') || !/^\d{6}$/.test(otp)) {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Valid email and 6-digit OTP are required.'
            });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(pauseKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, {
                error: 'not_found',
                message: 'No paused session found for this email. Start a new assessment or check the email address.'
            });
        }

        const record = JSON.parse(raw);
        if (Date.now() > Number(record.expiresAt || 0)) {
            await store.delete(pauseKey(email));
            return jsonResponse(410, {
                error: 'expired',
                message: 'This OTP has expired. Please start a new assessment or pause again if still in progress.'
            });
        }

        const expected = record.otpHash;
        const actual = hashOtp(otp, email);
        if (!safeEqualHex(expected, actual)) {
            return jsonResponse(403, {
                error: 'invalid_otp',
                message: 'Incorrect OTP. Check the code emailed to you and try again.'
            });
        }

        // One-time use: delete after successful verify
        await store.delete(pauseKey(email));

        return jsonResponse(200, {
            success: true,
            snapshot: record.snapshot,
            fullName: record.fullName,
            email: record.email,
            message: 'Session restored. Continue your assessment.'
        });
    } catch (err) {
        console.error('resume-assessment error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Could not resume assessment.',
            detail: err.message
        });
    }
};
