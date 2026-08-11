import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail
} from './lib/shared.mjs';
import { hashPassword } from './lib/password.mjs';
import { writeAudit } from './lib/audit.mjs';

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
        const username = String(body.username || '').trim().toLowerCase();
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');

        if (!username || !email) {
            return jsonResponse(400, { error: 'validation', message: 'Username and registered email are required.' }, origin);
        }
        const passErr = validatePassword(password);
        if (passErr) {
            return jsonResponse(400, { error: 'validation', message: passErr }, origin);
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Password reset is not available for this account. Contact recruitment.'
            }, origin);
        }

        const candidate = JSON.parse(raw);
        if (!candidate.passwordResetEnabled) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Password reset has not been enabled for your account. Contact recruitment.'
            }, origin);
        }
        if (normalizeEmail(candidate.email) !== email) {
            return jsonResponse(403, {
                error: 'not_allowed',
                message: 'Username and email do not match our records.'
            }, origin);
        }

        const upgraded = hashPassword(password);
        candidate.salt = upgraded.salt;
        candidate.passwordHash = upgraded.passwordHash;
        candidate.passwordResetEnabled = false;
        await store.set(candidateKey(username), JSON.stringify(candidate));

        await writeAudit(store, {
            actor: username,
            role: 'candidate',
            action: 'password_self_reset',
            target: username
        });

        return jsonResponse(200, {
            success: true,
            message: 'Password updated successfully. You can sign in with your new password.'
        }, origin);
    } catch (err) {
        console.error('candidate-reset-password error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};
