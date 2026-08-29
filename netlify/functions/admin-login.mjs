import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    verifyAdminCredentials,
    createAdminToken
} from './lib/shared.mjs';

export default async (req, context) => {
    const origin = req.headers.get('origin') || req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        const body = await req.json();
        const username = String(body.username || '').trim();
        const password = String(body.password || '');

        if (!verifyAdminCredentials(username, password)) {
            return jsonResponse(401, { error: 'Invalid credentials' }, origin);
        }

        const store = getAssessmentStore(context);
        const { token, signature } = await createAdminToken(store);

        return jsonResponse(200, {
            success: true,
            token: `${token}.${signature}`,
            expiresInHours: 24
        }, origin);
    } catch (err) {
        console.error('admin-login error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Signed in credentials were accepted, but the session could not be stored. Check Netlify Blobs locally.',
            detail: err.message
        }, origin);
    }
};