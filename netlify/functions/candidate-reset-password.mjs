import { createHash, randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

function hashPassword(password, salt) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function validatePassword(password) {
    const p = String(password || '');
    if (p.length < 12) return 'Password must be at least 12 characters.';
    if (!/\d/.test(p)) return 'Password must include at least one number.';
    if (!/[^A-Za-z0-9]/.test(p)) return 'Password must include at least one special character.';
    return null;
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
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');

        if (!username || !email) {
            return jsonResponse(400, { error: 'validation', message: 'Username and registered email are required.' });
        }
        const passErr = validatePassword(password);
        if (passErr) {
            return jsonResponse(400, { error: 'validation', message: passErr });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Password reset is not available for this account. Contact recruitment.'
            });
        }

        const candidate = JSON.parse(raw);
        if (!candidate.passwordResetEnabled) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Password reset has not been enabled for your account. Contact recruitment to enable it.'
            });
        }
        if (normalizeEmail(candidate.email) !== email) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Username and email do not match our records.'
            });
        }

        const salt = randomBytes(12).toString('hex');
        candidate.salt = salt;
        candidate.passwordHash = hashPassword(password, salt);
        candidate.passwordResetEnabled = false;
        await store.set(candidateKey(username), JSON.stringify(candidate));

        return jsonResponse(200, {
            success: true,
            message: 'Password updated successfully. You can sign in with your new password.'
        });
    } catch (err) {
        console.error('candidate-reset-password error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
