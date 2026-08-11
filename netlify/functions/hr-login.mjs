import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    createHrToken,
    hrKey
} from './lib/shared.mjs';
import { verifyPassword, hashPassword, needsRehash } from './lib/password.mjs';

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
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');

        if (!email || !password) {
            return jsonResponse(400, { error: 'Email and password are required.' }, origin);
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(hrKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(401, { error: 'Invalid email or password.' }, origin);
        }

        const account = JSON.parse(raw);
        if (account.active === false || account.pendingApproval) {
            return jsonResponse(403, {
                error: 'disabled',
                message: account.pendingApproval
                    ? 'Your HR account is pending administrator approval.'
                    : 'This HR account has been deactivated. Contact an administrator.'
            }, origin);
        }

        if (!verifyPassword(password, account)) {
            return jsonResponse(401, { error: 'Invalid email or password.' }, origin);
        }

        if (needsRehash(account)) {
            const upgraded = hashPassword(password);
            account.salt = upgraded.salt;
            account.passwordHash = upgraded.passwordHash;
            await store.set(hrKey(email), JSON.stringify(account));
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
        }, origin);
    } catch (err) {
        console.error('hr-login error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};
