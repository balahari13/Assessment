import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken,
    listAttempts
} from './lib/shared.mjs';

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        const authorized = await verifyAdminToken(store, req.headers.get('Authorization'));
        if (!authorized) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const results = await listAttempts(store);
        const summary = {
            total: results.length,
            avgGrammar: average(results.map(r => {
                if (typeof r.englishPercent === 'number') return r.englishPercent;
                const mcq = r.grammar?.percent || 0;
                const fill = r.fillBlank?.percent || 0;
                return r.fillBlank ? Math.round((mcq + fill) / 2) : mcq;
            })),
            avgTypingWpm: average(results.map(r => r.typing?.bestWpm || 0)),
            avgVoice: average(results.map(r => r.voice?.completionPercent || 0))
        };

        return jsonResponse(200, { results, summary });
    } catch (err) {
        console.error('admin-results error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};

function average(nums) {
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}