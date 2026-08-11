import { createHash, randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    createHrToken,
    hrKey,
    hrIndexKey
} from './lib/shared.mjs';

function hashPassword(password, salt) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function validatePassword(password) {
    const p = String(password || '');
    if (p.length < 10) return 'Password must be at least 10 characters.';
    if (!/\d/.test(p)) return 'Password must include at least one number.';
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
        const fullName = String(body.fullName || '').trim();
        const email = normalizeEmail(body.email);
        const phone = String(body.phone || '').trim();
        const password = String(body.password || '');

        if (!fullName || !email || !email.includes('@')) {
            return jsonResponse(400, { error: 'validation', message: 'Full name and work email are required.' });
        }
        const passErr = validatePassword(password);
        if (passErr) return jsonResponse(400, { error: 'validation', message: passErr });

        const store = getAssessmentStore(context);
        const existing = await store.get(hrKey(email), { type: 'text' });
        if (existing) {
            return jsonResponse(409, {
                error: 'exists',
                message: 'An HR account with this email already exists. Please sign in.'
            });
        }

        const salt = randomBytes(12).toString('hex');
        const account = {
            fullName,
            email,
            phone,
            salt,
            passwordHash: hashPassword(password, salt),
            active: true,
            role: 'hr',
            createdAt: new Date().toISOString()
        };
        await store.set(hrKey(email), JSON.stringify(account));

        const idxRaw = await store.get(hrIndexKey(), { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(email)) {
            index.push(email);
            await store.set(hrIndexKey(), JSON.stringify(index));
        }

        const { token } = await createHrToken(store, account);

        return jsonResponse(200, {
            success: true,
            token,
            fullName: account.fullName,
            email: account.email,
            phone: account.phone,
            role: 'hr',
            message: 'HR account created. You can manage interviews and the hiring pipeline.'
        });
    } catch (err) {
        console.error('hr-register error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
