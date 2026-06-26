import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken,
    listAttempts
} from './_shared.mjs';

export default async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore();
        const authorized = await verifyAdminToken(store, req.headers.get('Authorization'));
        if (!authorized) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const results = await listAttempts(store);
        const summary = {
            total: results.length,
            avgGrammar: average(results.map(r => r.grammar?.percent || 0)),
            avgTypingWpm: average(results.map(r => r.typing?.bestWpm || 0)),
            avgVoice: average(results.map(r => r.voice?.completionPercent || 0))
        };

        return jsonResponse(200, { results, summary });
    } catch (err) {
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};

function average(nums) {
    if (!nums.length) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}