import { createHash } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    createHrToken,
    hrKey
} from './lib/shared.mjs';

function hashPassword(password, salt) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
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
        const password = String(body.password || '');

        if (!email || !password) {
            return jsonResponse(400, { error: 'Email and password are required.' });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(hrKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(401, { error: 'Invalid email or password.' });
        }

        const account = JSON.parse(raw);
        if (account.active === false) {
            return jsonResponse(403, {
                error: 'disabled',
                message: 'This HR account has been deactivated. Contact an administrator.'
            });
        }

        const hash = hashPassword(password, account.salt);
        if (hash !== account.passwordHash) {
            return jsonResponse(401, { error: 'Invalid email or password.' });
        }

        const { token } = await createHrToken(store, account);

        return jsonResponse(200, {
            success: true,
            token,
            fullName: account.fullName,
            email: account.email,
            phone: account.phone || '',
            role: 'hr',
            message: 'Signed in successfully.'
        });
    } catch (err) {
        console.error('hr-login error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
