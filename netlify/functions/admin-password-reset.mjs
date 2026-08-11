import { randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
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

function generateTempPassword() {
    const base = randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    return `${base}A1!`;
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
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' }, origin);
        }

        const body = await req.json();
        const username = String(body.username || '').trim().toLowerCase();
        const action = String(body.action || '').trim();

        if (!username) {
            return jsonResponse(400, { error: 'Username required' }, origin);
        }

        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'not_found', message: 'Candidate account not found.' }, origin);
        }

        const candidate = JSON.parse(raw);

        if (action === 'enable') {
            candidate.passwordResetEnabled = true;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            await writeAudit(store, {
                actor: 'admin',
                role: 'admin',
                action: 'password_reset_enable',
                target: username
            });
            return jsonResponse(200, {
                success: true,
                passwordResetEnabled: true,
                message: `Password reset enabled for @${username}.`
            }, origin);
        }

        if (action === 'disable') {
            candidate.passwordResetEnabled = false;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            await writeAudit(store, {
                actor: 'admin',
                role: 'admin',
                action: 'password_reset_disable',
                target: username
            });
            return jsonResponse(200, {
                success: true,
                passwordResetEnabled: false,
                message: `Password reset disabled for @${username}.`
            }, origin);
        }

        if (action === 'set-temp') {
            const tempPassword = String(body.password || '').trim() || generateTempPassword();
            const passErr = validatePassword(tempPassword);
            if (passErr) {
                return jsonResponse(400, { error: 'validation', message: passErr }, origin);
            }
            const upgraded = hashPassword(tempPassword);
            candidate.salt = upgraded.salt;
            candidate.passwordHash = upgraded.passwordHash;
            candidate.passwordResetEnabled = false;
            await store.set(candidateKey(username), JSON.stringify(candidate));
            await writeAudit(store, {
                actor: 'admin',
                role: 'admin',
                action: 'password_temp_set',
                target: username
            });
            return jsonResponse(200, {
                success: true,
                temporaryPassword: tempPassword,
                message: `Temporary password set for @${username}. Share it securely.`
            }, origin);
        }

        return jsonResponse(400, {
            error: 'invalid_action',
            message: 'action must be enable, disable, or set-temp.'
        }, origin);
    } catch (err) {
        console.error('admin-password-reset error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};
