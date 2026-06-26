import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const STORE_NAME = 'trinitas-assessments';
const ADMIN_ID = 'Trinitas';
const ADMIN_PASSWORD = 'Trinitas2026*';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
}

export function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}

export function getAssessmentStore() {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function attemptKey(email) {
    return `attempt:${normalizeEmail(email)}`;
}

export async function getAttempt(store, email) {
    const raw = await store.get(attemptKey(email), { type: 'text' });
    return raw ? JSON.parse(raw) : null;
}

export async function listAttempts(store) {
    const raw = await store.get('attempts-index', { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    const results = [];
    for (const email of index) {
        const item = await getAttempt(store, email);
        if (item) results.push(item);
    }
    return results.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
}

export async function saveAttempt(store, attempt) {
    const email = normalizeEmail(attempt.email);
    const existing = await getAttempt(store, email);
    if (existing) {
        return { ok: false, reason: 'already_completed' };
    }
    attempt.email = email;
    attempt.blocked = true;
    await store.set(attemptKey(email), JSON.stringify(attempt));

    const raw = await store.get('attempts-index', { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    if (!index.includes(email)) {
        index.push(email);
        await store.set('attempts-index', JSON.stringify(index));
    }
    return { ok: true };
}

function signToken(token) {
    const secret = process.env.ADMIN_TOKEN_SECRET || 'trinitas-admin-secret';
    return createHmac('sha256', secret).update(token).digest('hex');
}

export async function createAdminToken(store) {
    const token = randomBytes(24).toString('hex');
    const payload = {
        createdAt: Date.now(),
        expiresAt: Date.now() + TOKEN_TTL_MS
    };
    await store.set(`session:${token}`, JSON.stringify(payload));
    return { token, signature: signToken(token) };
}

export async function verifyAdminToken(store, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const value = authHeader.slice(7).trim();
    const [token, signature] = value.split('.');
    if (!token || !signature) return false;

    const expected = signToken(token);
    try {
        const a = Buffer.from(signature, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    } catch {
        return false;
    }

    const raw = await store.get(`session:${token}`, { type: 'text' });
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
        await store.delete(`session:${token}`);
        return false;
    }
    return true;
}

export function verifyAdminCredentials(username, password) {
    return username === ADMIN_ID && password === ADMIN_PASSWORD;
}