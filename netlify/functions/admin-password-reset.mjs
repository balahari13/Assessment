import { createHash, randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
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

function generateTempPassword() {
    const base = randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    return `${base}A1!`;
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
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const body = await req.json();
        const username = String(body.username || '').trim().toLowerCase();
        const action = String(body.action || '').trim();

        if (!username) {
            return jsonResponse(400, { error: 'Username required' });
        }

        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'not_found', message: 'Candidate account not found.' });
        }

        const candidate = JSON.parse(raw);

        if (action === 'enable') {
            candidate.passwordResetEnabled = true;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            return jsonResponse(200, {
                success: true,
                passwordResetEnabled: true,
                message: `Password reset enabled for @${username}. They can set a new password on Careers using username and registered email.`
            });
        }

        if (action === 'disable') {
            candidate.passwordResetEnabled = false;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            return jsonResponse(200, {
                success: true,
                passwordResetEnabled: false,
                message: `Password reset disabled for @${username}.`
            });
        }

        if (action === 'set-temp') {
            const tempPassword = String(body.password || '').trim() || generateTempPassword();
            const passErr = validatePassword(tempPassword);
            if (passErr) {
                return jsonResponse(400, { error: 'validation', message: passErr });
            }
            const salt = randomBytes(12).toString('hex');
            candidate.salt = salt;
            candidate.passwordHash = hashPassword(tempPassword, salt);
            candidate.passwordResetEnabled = false;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            return jsonResponse(200, {
                success: true,
                temporaryPassword: tempPassword,
                message: `Temporary password set for @${username}. Share it securely with the candidate, then ask them to sign in.`
            });
        }

        return jsonResponse(400, {
            error: 'invalid_action',
            message: 'action must be enable, disable, or set-temp.'
        });
    } catch (err) {
        console.error('admin-password-reset error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
