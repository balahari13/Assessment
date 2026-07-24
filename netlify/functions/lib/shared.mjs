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

export function getAssessmentStore(context) {
    const siteID = context?.site?.id || process.env.SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN;
    if (siteID && token) {
        return getStore({ name: STORE_NAME, siteID, token, consistency: 'strong' });
    }
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function attemptKey(email) {
    return `attempt:${normalizeEmail(email)}`;
}

export function normalizeCandidate(raw, email) {
    if (!raw) return null;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.attempt1 !== undefined || data.attempt2 !== undefined || data.attempt2Enabled !== undefined) {
        return data;
    }
    if (data.overallScore !== undefined || data.grammar || data.englishPercent !== undefined) {
        return {
            email: data.email || email,
            fullName: data.fullName,
            phone: data.phone,
            attempt1: data,
            attempt2: null,
            attempt2Enabled: false,
            updatedAt: data.completedAt || null
        };
    }
    return data;
}

export async function getCandidate(store, email) {
    const raw = await store.get(attemptKey(email), { type: 'text' });
    if (!raw) return null;
    return normalizeCandidate(raw, email);
}

export async function getAttempt(store, email) {
    const candidate = await getCandidate(store, email);
    return candidate?.attempt1 || null;
}

export async function listAttempts(store) {
    const raw = await store.get('attempts-index', { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    const results = [];
    for (const email of index) {
        const item = await getCandidate(store, email);
        if (item) results.push(item);
    }
    return results.sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.attempt2?.completedAt || a.attempt1?.completedAt || 0);
        const bDate = new Date(b.updatedAt || b.attempt2?.completedAt || b.attempt1?.completedAt || 0);
        return bDate - aDate;
    });
}

async function upsertIndex(store, email) {
    const raw = await store.get('attempts-index', { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    if (!index.includes(email)) {
        index.push(email);
        await store.set('attempts-index', JSON.stringify(index));
    }
}

export async function saveSubmission(store, submission) {
    const email = normalizeEmail(
        typeof submission.email === 'string' ? submission.email : submission.contactEmail
    );
    if (!email || !email.includes('@')) {
        return { ok: false, reason: 'invalid_email' };
    }

    const attemptNumber = Number(submission.attemptNumber) || 1;
    let candidate = await getCandidate(store, email) || {
        email,
        fullName: submission.fullName,
        phone: submission.phone,
        attempt1: null,
        attempt2: null,
        attempt2Enabled: false
    };

    // Build a clean record: contact email is always a string
    const emailWriting = submission.emailWriting || submission.emailAssessment || {};
    const record = {
        email,
        fullName: submission.fullName,
        phone: submission.phone,
        registeredAt: submission.registeredAt || null,
        durationMinutes: submission.durationMinutes ?? null,
        timedOut: !!submission.timedOut,
        terminatedReason: submission.terminatedReason || null,
        tabSwitchCount: Number(submission.tabSwitchCount) || 0,
        overallScore: Number(submission.overallScore) || 0,
        oddman: submission.oddman || {},
        scenarios: submission.scenarios || {},
        grammar: submission.grammar || {},
        fillBlank: submission.fillBlank || {},
        englishPercent: Number(submission.englishPercent) || 0,
        reading: submission.reading || {},
        workplace: submission.workplace || {},
        emailWriting,
        // Admin detail view uses .email for writing scores when object-shaped
        email: emailWriting,
        typing: submission.typing || {},
        voice: submission.voice || {},
        completedAt: new Date().toISOString()
    };
    // contact email must remain on the parent candidate; section scores store writing under record.email (object)
    // Keep string contact on record as contactEmail for clarity
    record.contactEmail = email;

    if (attemptNumber === 1) {
        if (candidate.attempt1) return { ok: false, reason: 'attempt1_exists' };
        candidate.attempt1 = record;
        candidate.fullName = submission.fullName;
        candidate.phone = submission.phone;
        candidate.email = email;
    } else if (attemptNumber === 2) {
        if (!candidate.attempt1) return { ok: false, reason: 'attempt1_required' };
        if (!candidate.attempt2Enabled) return { ok: false, reason: 'attempt2_not_enabled' };
        if (candidate.attempt2) return { ok: false, reason: 'attempt2_exists' };
        candidate.attempt2 = record;
        candidate.email = email;
    } else {
        return { ok: false, reason: 'invalid_attempt' };
    }

    candidate.updatedAt = new Date().toISOString();
    try {
        await store.set(attemptKey(email), JSON.stringify(candidate));
        await upsertIndex(store, email);
    } catch (err) {
        console.error('saveSubmission store error:', err);
        return { ok: false, reason: 'store_error', detail: err.message };
    }
    return { ok: true };
}

export async function saveAttempt(store, attempt) {
    return saveSubmission(store, { ...attempt, attemptNumber: attempt.attemptNumber || 1 });
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

export async function deleteAttempt(store, email) {
    const normalized = normalizeEmail(email);
    await store.delete(attemptKey(normalized));
    const raw = await store.get('attempts-index', { type: 'text' });
    const index = raw ? JSON.parse(raw) : [];
    const filtered = index.filter(e => e !== normalized);
    await store.set('attempts-index', JSON.stringify(filtered));
    return { ok: true, email: normalized };
}

export async function allowReattempt(store, email) {
    const result = await deleteAttempt(store, email);
    const raw = await store.get('reattempt-log', { type: 'text' });
    const log = raw ? JSON.parse(raw) : [];
    log.push({ email: result.email, grantedAt: new Date().toISOString(), type: 'full-reset' });
    await store.set('reattempt-log', JSON.stringify(log));
    return result;
}

export async function enableSecondAttempt(store, email) {
    const normalized = normalizeEmail(email);
    const candidate = await getCandidate(store, normalized);
    if (!candidate?.attempt1) {
        return { ok: false, reason: 'no_attempt1' };
    }
    candidate.attempt2Enabled = true;
    candidate.updatedAt = new Date().toISOString();
    await store.set(attemptKey(normalized), JSON.stringify(candidate));

    const raw = await store.get('reattempt-log', { type: 'text' });
    const log = raw ? JSON.parse(raw) : [];
    log.push({ email: normalized, grantedAt: new Date().toISOString(), type: 'attempt2-enabled' });
    await store.set('reattempt-log', JSON.stringify(log));

    return { ok: true, email: normalized };
}