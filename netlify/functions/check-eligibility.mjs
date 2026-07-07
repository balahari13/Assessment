import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    getCandidate
} from './lib/shared.mjs';

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = await req.json();
        const email = normalizeEmail(body.email);
        const attemptNumber = Number(body.attemptNumber) || 1;

        if (!email || !email.includes('@')) {
            return jsonResponse(400, { error: 'Valid email required' });
        }

        const store = getAssessmentStore(context);
        const candidate = await getCandidate(store, email);

        if (attemptNumber === 1) {
            if (candidate?.attempt1) {
                return jsonResponse(200, {
                    eligible: false,
                    blocked: true,
                    attemptNumber: 1,
                    message: 'This email has already completed Attempt 1.'
                });
            }
            return jsonResponse(200, { eligible: true, blocked: false, attemptNumber: 1 });
        }

        if (attemptNumber === 2) {
            if (!candidate?.attempt1) {
                return jsonResponse(200, {
                    eligible: false,
                    blocked: true,
                    attemptNumber: 2,
                    message: 'You must complete Attempt 1 before taking the advanced second attempt.'
                });
            }
            if (!candidate.attempt2Enabled) {
                return jsonResponse(200, {
                    eligible: false,
                    blocked: true,
                    attemptNumber: 2,
                    attempt2Enabled: false,
                    message: 'Attempt 2 is not enabled for your email yet. Please check back later.'
                });
            }
            if (candidate.attempt2) {
                return jsonResponse(200, {
                    eligible: false,
                    blocked: true,
                    attemptNumber: 2,
                    message: 'This email has already completed Attempt 2.'
                });
            }
            return jsonResponse(200, {
                eligible: true,
                blocked: false,
                attemptNumber: 2,
                attempt2Enabled: true
            });
        }

        return jsonResponse(400, { error: 'Invalid attempt number' });
    } catch (err) {
        console.error('check-eligibility error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};