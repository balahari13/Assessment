import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    verifyAdminToken
} from './lib/shared.mjs';

const PAUSE_INDEX = 'pause-index';

function pauseKey(email) {
    return `pause:${normalizeEmail(email)}`;
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        const auth = req.headers.get('authorization') || req.headers.get('Authorization');
        const valid = await verifyAdminToken(store, auth);
        if (!valid) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const raw = await store.get(PAUSE_INDEX, { type: 'text' });
        const index = raw ? JSON.parse(raw) : [];
        const sessions = [];
        const stillValid = [];

        for (const email of index) {
            const itemRaw = await store.get(pauseKey(email), { type: 'text' });
            if (!itemRaw) continue;
            let rec;
            try {
                rec = JSON.parse(itemRaw);
            } catch {
                continue;
            }
            if (Date.now() > Number(rec.snapshotExpiresAt || 0)) {
                await store.delete(pauseKey(email));
                continue;
            }
            stillValid.push(normalizeEmail(email));
            sessions.push({
                email: rec.email,
                fullName: rec.fullName || '—',
                phone: rec.phone || '—',
                pausedAt: rec.pausedAt || null,
                status: rec.otpHash ? 'otp_ready' : 'paused',
                otpGeneratedAt: rec.otpGeneratedAt || null,
                attemptNumber: rec.snapshot?.session?.attemptNumber || 1,
                sectionIndex: rec.snapshot?.sectionIndex ?? null
            });
        }

        if (stillValid.length !== index.length) {
            await store.set(PAUSE_INDEX, JSON.stringify(stillValid));
        }

        sessions.sort((a, b) => new Date(b.pausedAt || 0) - new Date(a.pausedAt || 0));

        return jsonResponse(200, { success: true, sessions, total: sessions.length });
    } catch (err) {
        console.error('admin-paused error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
