import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken,
    hrKey,
    hrIndexKey,
    normalizeEmail
} from './lib/shared.mjs';

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        if (req.method === 'GET') {
            const idxRaw = await store.get(hrIndexKey(), { type: 'text' });
            const index = idxRaw ? JSON.parse(idxRaw) : [];
            const team = [];
            for (const email of index) {
                const raw = await store.get(hrKey(email), { type: 'text' });
                if (!raw) continue;
                try {
                    const a = JSON.parse(raw);
                    team.push({
                        fullName: a.fullName,
                        email: a.email,
                        phone: a.phone || '',
                        active: a.active !== false,
                        createdAt: a.createdAt || null
                    });
                } catch {
                    /* skip */
                }
            }
            team.sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
            return jsonResponse(200, { success: true, team, total: team.length });
        }

        const body = await req.json();
        const action = String(body.action || '').trim();
        const email = normalizeEmail(body.email);
        if (!email) {
            return jsonResponse(400, { error: 'Email required' });
        }

        const raw = await store.get(hrKey(email), { type: 'text' });
        if (!raw) {
            return jsonResponse(404, { error: 'HR account not found' });
        }
        const account = JSON.parse(raw);

        if (action === 'deactivate') {
            account.active = false;
            await store.set(hrKey(email), JSON.stringify(account));
            return jsonResponse(200, { success: true, message: `HR account ${email} deactivated.` });
        }
        if (action === 'activate') {
            account.active = true;
            await store.set(hrKey(email), JSON.stringify(account));
            return jsonResponse(200, { success: true, message: `HR account ${email} activated.` });
        }
        if (action === 'delete') {
            await store.delete(hrKey(email));
            const idxRaw = await store.get(hrIndexKey(), { type: 'text' });
            const index = idxRaw ? JSON.parse(idxRaw) : [];
            await store.set(hrIndexKey(), JSON.stringify(index.filter(e => e !== email)));
            return jsonResponse(200, { success: true, message: `HR account ${email} removed.` });
        }

        return jsonResponse(400, { error: 'invalid_action', message: 'action must be activate, deactivate, or delete.' });
    } catch (err) {
        console.error('admin-hr error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};
