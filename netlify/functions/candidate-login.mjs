import { randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore
} from './lib/shared.mjs';
import { verifyPassword, hashPassword, needsRehash } from './lib/password.mjs';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
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
        const password = String(body.password || '');

        if (!username || !password) {
            return jsonResponse(400, { error: 'Username and password are required.' }, origin);
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(401, { error: 'Invalid username or password.' }, origin);
        }

        const candidate = JSON.parse(raw);
        if (!verifyPassword(password, candidate)) {
            return jsonResponse(401, { error: 'Invalid username or password.' }, origin);
        }

        if (needsRehash(candidate)) {
            const upgraded = hashPassword(password);
            candidate.salt = upgraded.salt;
            candidate.passwordHash = upgraded.passwordHash;
            await store.set(candidateKey(username), JSON.stringify(candidate));
        }

        const token = randomBytes(24).toString('hex');
        await store.set(`candidate-session:${token}`, JSON.stringify({
            username: candidate.username,
            email: candidate.email,
            fullName: candidate.fullName,
            phone: candidate.phone,
            referenceId: candidate.referenceId || null,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        return jsonResponse(200, {
            success: true,
            token,
            username: candidate.username,
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone,
            referenceId: candidate.referenceId || null,
            message: 'Signed in successfully.'
        }, origin);
    } catch (err) {
        console.error('candidate-login error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message }, origin);
    }
};
