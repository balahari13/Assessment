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

        function pickSubmission(candidate, attemptNumber) {
            if (candidate.attempt1 !== undefined) {
                return attemptNumber === 1 ? candidate.attempt1 : candidate.attempt2;
            }
            return attemptNumber === 1 ? candidate : null;
        }

        function englishPercent(submission) {
            if (!submission) return 0;
            if (typeof submission.englishPercent === 'number') return submission.englishPercent;
            const mcq = submission.grammar?.percent || 0;
            const fill = submission.fillBlank?.percent || 0;
            return submission.fillBlank ? Math.round((mcq + fill) / 2) : mcq;
        }

        const attempt1Rows = results.map(r => pickSubmission(r, 1)).filter(Boolean);
        const summary = {
            total: results.length,
            avgGrammar: average(attempt1Rows.map(englishPercent)),
            avgReading: average(attempt1Rows.map(r => r.reading?.percent || 0)),
            avgWorkplace: average(attempt1Rows.map(r => r.workplace?.percent || 0)),
            avgTypingWpm: average(attempt1Rows.map(r => r.typing?.bestWpm || 0)),
            avgVoice: average(attempt1Rows.map(r => r.voice?.completionPercent || 0))
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