import { createHash, randomBytes } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    agentKey,
    isSiteAdminEmail,
    verifyAdminCredentials
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
            return jsonResponse(400, { error: 'Email and password required' });
        }

        const store = getAssessmentStore(context);

        // Site admin can open agent admin view
        if (isSiteAdminEmail(email) && verifyAdminCredentials(email, password)) {
            const token = randomBytes(24).toString('hex');
            await store.set(`agent-session:${token}`, JSON.stringify({
                email,
                isAdmin: true,
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
            }));
            return jsonResponse(200, {
                success: true,
                token,
                isAdmin: true,
                email,
                fullName: 'Balaharimurthy',
                message: 'Admin signed in'
            });
        }

        const raw = await store.get(agentKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(401, { error: 'Invalid email or password' });
        }

        const agent = JSON.parse(raw);
        const hash = hashPassword(password, agent.salt);
        if (hash !== agent.passwordHash) {
            return jsonResponse(401, { error: 'Invalid email or password' });
        }

        const token = randomBytes(24).toString('hex');
        await store.set(`agent-session:${token}`, JSON.stringify({
            email: agent.email,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        return jsonResponse(200, {
            success: true,
            token,
            isAdmin: false,
            email: agent.email,
            fullName: agent.fullName,
            message: 'Signed in'
        });
    } catch (err) {
        console.error('agent-login error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
