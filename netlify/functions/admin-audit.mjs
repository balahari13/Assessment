import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken
} from './lib/shared.mjs';
import { listAudit } from './lib/audit.mjs';

export default async (req, context) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' }, origin);
        }
        const url = new URL(req.url);
        const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit')) || 80));
        const items = await listAudit(store, limit);
        return jsonResponse(200, { success: true, items, total: items.length }, origin);
    } catch (err) {
        console.error('admin-audit error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message }, origin);
    }
};
