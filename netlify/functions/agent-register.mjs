import { createHash, randomBytes, randomInt } from 'crypto';
import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    agentKey,
    agentIndexKey
} from './lib/shared.mjs';

function hashPassword(password, salt) {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function lettersOnly(name) {
    return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

function pickRandomLetters(letters, count) {
    if (!letters.length) return 'agent';
    let out = '';
    for (let i = 0; i < count; i++) {
        out += letters[randomInt(0, letters.length)];
    }
    return out;
}

async function generateUniqueEmail(store, fullName) {
    const letters = lettersOnly(fullName);
    const basePool = letters.length >= 3 ? letters : (letters + 'trinitas').slice(0, 12);

    for (let attempt = 0; attempt < 40; attempt++) {
        const len = 5 + randomInt(0, 4); // 5–8 letters
        const prefix = pickRandomLetters(basePool, len);
        const num = randomInt(10, 99);
        const email = normalizeEmail(`${prefix}${num}@agent.trinitas.in`);
        const existing = await store.get(agentKey(email), { type: 'text' });
        if (!existing) return email;
    }
    // Fallback
    const fallback = normalizeEmail(`agent${Date.now().toString(36)}@agent.trinitas.in`);
    return fallback;
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
        const password = String(body.password || '');
        const phone = String(body.phone || '').trim();

        if (fullName.length < 3) {
            return jsonResponse(400, { error: 'validation', message: 'Please enter your full name.' });
        }
        if (password.length < 6) {
            return jsonResponse(400, { error: 'validation', message: 'Password must be at least 6 characters.' });
        }

        const store = getAssessmentStore(context);
        const agentEmail = await generateUniqueEmail(store, fullName);
        const salt = randomBytes(12).toString('hex');
        const passwordHash = hashPassword(password, salt);

        const agent = {
            fullName,
            email: agentEmail,
            phone,
            salt,
            passwordHash,
            applications: [],
            todos: [
                { id: 't1', text: 'Complete profile details', done: false },
                { id: 't2', text: 'Review open roles and apply', done: false },
                { id: 't3', text: 'Complete company orientation checklist', done: false }
            ],
            createdAt: new Date().toISOString()
        };

        await store.set(agentKey(agentEmail), JSON.stringify(agent));

        const idxRaw = await store.get(agentIndexKey(), { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        if (!index.includes(agentEmail)) {
            index.push(agentEmail);
            await store.set(agentIndexKey(), JSON.stringify(index));
        }

        const token = randomBytes(24).toString('hex');
        await store.set(`agent-session:${token}`, JSON.stringify({
            email: agentEmail,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        return jsonResponse(200, {
            success: true,
            email: agentEmail,
            fullName,
            token,
            message: `Your agent mail is ${agentEmail}. Save it — you will use it to sign in.`
        });
    } catch (err) {
        console.error('agent-register error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
