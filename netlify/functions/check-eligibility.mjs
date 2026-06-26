import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    getAttempt
} from './_shared.mjs';

export default async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = await req.json();
        const email = normalizeEmail(body.email);
        if (!email || !email.includes('@')) {
            return jsonResponse(400, { error: 'Valid email required' });
        }

        const store = getAssessmentStore();
        const existing = await getAttempt(store, email);

        if (existing) {
            return jsonResponse(200, {
                eligible: false,
                blocked: true,
                message: 'This email has already completed the assessment. Reattempts are not permitted.'
            });
        }

        return jsonResponse(200, { eligible: true, blocked: false });
    } catch (err) {
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};