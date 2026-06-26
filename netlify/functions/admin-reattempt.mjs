import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminToken,
    allowReattempt,
    normalizeEmail
} from './lib/shared.mjs';

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const store = getAssessmentStore(context);
        if (!await verifyAdminToken(store, req.headers.get('Authorization'))) {
            return jsonResponse(401, { error: 'Unauthorized' });
        }

        const body = await req.json();
        const email = normalizeEmail(body.email);
        if (!email) {
            return jsonResponse(400, { error: 'Email required' });
        }

        await allowReattempt(store, email);
        return jsonResponse(200, {
            success: true,
            message: `${email} can now retake the assessment.`
        });
    } catch (err) {
        console.error('admin-reattempt error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};