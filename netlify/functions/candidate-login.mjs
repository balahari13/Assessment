import { createHash, randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore
} from './lib/shared.mjs';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

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
        const username = String(body.username || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!username || !password) {
            return jsonResponse(400, { error: 'Username and password are required.' });
        }

        const store = getAssessmentStore(context);
        const raw = await store.get(candidateKey(username), { type: 'text' });
        if (!raw) {
            return jsonResponse(401, { error: 'Invalid username or password.' });
        }

        const candidate = JSON.parse(raw);
        const hash = hashPassword(password, candidate.salt);
        if (hash !== candidate.passwordHash) {
            return jsonResponse(401, { error: 'Invalid username or password.' });
        }

        // Legacy accounts created before email verification
        if (candidate.emailVerified === undefined) {
            candidate.emailVerified = true;
            await store.set(candidateKey(username), JSON.stringify(candidate));
        }

        if (!candidate.emailVerified) {
            return jsonResponse(403, {
                error: 'email_unverified',
                needsVerification: true,
                username: candidate.username,
                email: candidate.email,
                fullName: candidate.fullName,
                phone: candidate.phone,
                message: 'Please verify your email with the 6-digit code we sent before signing in.'
            });
        }

        const token = randomBytes(24).toString('hex');
        await store.set(`candidate-session:${token}`, JSON.stringify({
            username: candidate.username,
            email: candidate.email,
            fullName: candidate.fullName,
            phone: candidate.phone,
            emailVerified: true,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        return jsonResponse(200, {
            success: true,
            token,
            username: candidate.username,
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone,
            message: 'Signed in successfully.'
        });
    } catch (err) {
        console.error('candidate-login error:', err);
        return jsonResponse(500, { error: 'Server error', message: err.message });
    }
};
