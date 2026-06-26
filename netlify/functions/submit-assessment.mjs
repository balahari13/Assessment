import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    saveAttempt,
    getAttempt
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
        const fullName = String(body.fullName || '').trim();
        const phone = String(body.phone || '').trim();

        if (!email || !fullName || !phone) {
            return jsonResponse(400, { error: 'Name, email, and phone are required' });
        }

        const store = getAssessmentStore(context);
        const existing = await getAttempt(store, email);
        if (existing) {
            return jsonResponse(403, {
                error: 'blocked',
                message: 'This email has already completed the assessment.'
            });
        }

        const attempt = {
            email,
            fullName,
            phone,
            registeredAt: body.registeredAt || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMinutes: body.durationMinutes || null,
            timedOut: !!body.timedOut,
            terminatedReason: body.terminatedReason || null,
            tabSwitchCount: body.tabSwitchCount || 0,
            grammar: body.grammar || {},
            fillBlank: body.fillBlank || {},
            englishPercent: body.englishPercent || 0,
            typing: body.typing || {},
            voice: body.voice || {},
            overallScore: body.overallScore || 0
        };

        const saved = await saveAttempt(store, attempt);
        if (!saved.ok) {
            return jsonResponse(403, {
                error: 'blocked',
                message: 'This email has already completed the assessment.'
            });
        }

        return jsonResponse(200, { success: true, message: 'Assessment submitted successfully' });
    } catch (err) {
        console.error('submit-assessment error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};