import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
} from './lib/shared.mjs';

const CANDIDATE_INDEX = 'candidate-index';

function candidateKey(username) {
    return `candidate:${String(username || '').trim().toLowerCase()}`;
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const idxRaw = await store.get(CANDIDATE_INDEX, { type: 'text' });
        const index = idxRaw ? JSON.parse(idxRaw) : [];
        const candidates = [];

        for (const username of index.slice().reverse()) {
            const raw = await store.get(candidateKey(username), { type: 'text' });
            if (!raw) continue;
            try {
                const c = JSON.parse(raw);
                candidates.push({
                    username: c.username,
                    fullName: c.fullName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    role: c.role || '',
                    passwordResetEnabled: !!c.passwordResetEnabled,
                    createdAt: c.createdAt || null
                });
            } catch {
                /* skip corrupt */
            }
        }

        return jsonResponse(200, { success: true, candidates });
    } catch (err) {
        console.error('admin-candidates error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
