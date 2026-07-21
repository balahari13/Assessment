import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    saveSubmission,
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
        const fullName = String(body.fullName || '').trim();
        const phone = String(body.phone || '').trim();
        const attemptNumber = Number(body.attemptNumber) || 1;

        if (!email || !fullName || !phone) {
            return jsonResponse(400, { error: 'Name, email, and phone are required' });
        }

        const store = getAssessmentStore(context);
        const candidate = await getCandidate(store, email);

        if (attemptNumber === 1 && candidate?.attempt1) {
            return jsonResponse(403, {
                error: 'blocked',
                message: 'This email has already completed Attempt 1.'
            });
        }

        if (attemptNumber === 2) {
            if (!candidate?.attempt1) {
                return jsonResponse(403, {
                    error: 'blocked',
                    message: 'Attempt 1 must be completed before Attempt 2.'
                });
            }
            if (!candidate.attempt2Enabled) {
                return jsonResponse(403, {
                    error: 'blocked',
                    message: 'Second attempt is not enabled for this email.'
                });
            }
            if (candidate.attempt2) {
                return jsonResponse(403, {
                    error: 'blocked',
                    message: 'This email has already completed Attempt 2.'
                });
            }
        }

        const submission = {
            email,
            fullName,
            phone,
            attemptNumber,
            registeredAt: body.registeredAt || new Date().toISOString(),
            durationMinutes: body.durationMinutes || null,
            timedOut: !!body.timedOut,
            terminatedReason: body.terminatedReason || null,
            tabSwitchCount: body.tabSwitchCount || 0,
            grammar: body.grammar || {},
            fillBlank: body.fillBlank || {},
            englishPercent: body.englishPercent || 0,
            reading: body.reading || {},
            workplace: body.workplace || {},
            email: body.emailWriting || body.emailSection || {},
            typing: body.typing || {},
            voice: body.voice || {},
            overallScore: body.overallScore || 0
        };

        const saved = await saveSubmission(store, submission);
        if (!saved.ok) {
            const messages = {
                attempt1_exists: 'This email has already completed Attempt 1.',
                attempt1_required: 'Attempt 1 must be completed first.',
                attempt2_not_enabled: 'Second attempt is not enabled for this email.',
                attempt2_exists: 'This email has already completed Attempt 2.'
            };
            return jsonResponse(403, {
                error: 'blocked',
                message: messages[saved.reason] || 'Submission blocked.'
            });
        }

        return jsonResponse(200, {
            success: true,
            attemptNumber,
            message: `Attempt ${attemptNumber} submitted successfully`
        });
    } catch (err) {
        console.error('submit-assessment error:', err);
        return jsonResponse(500, { error: 'Server error', detail: err.message });
    }
};