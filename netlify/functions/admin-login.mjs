import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminCredentials,
    createAdminToken
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
        const username = String(body.username || '').trim();
        const password = String(body.password || '');

        if (!verifyAdminCredentials(username, password)) {
            return jsonResponse(401, { error: 'Invalid credentials' });
        }

        const store = getAssessmentStore();
        const { token, signature } = await createAdminToken(store);

        return jsonResponse(200, {
            success: true,
            token: `${token}.${signature}`,
            expiresInHours: 24
        });
    } catch (err) {
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};