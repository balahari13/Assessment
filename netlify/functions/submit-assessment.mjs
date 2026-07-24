import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    saveSubmission,
    getCandidate
} from './lib/shared.mjs';

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export default async (req, context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return jsonResponse(400, { error: 'Invalid JSON body' });
        }

        // Contact email only — never reuse the email-writing object field
        const email = normalizeEmail(
            body.candidateEmail ||
            (typeof body.email === 'string' ? body.email : '') ||
            body.contactEmail
        );
        const fullName = String(body.fullName || '').trim();
        const phone = String(body.phone || '').trim();
        const attemptNumber = Number(body.attemptNumber) || 1;

        if (!email || !email.includes('@') || !fullName || !phone) {
            return jsonResponse(400, {
                error: 'validation',
                message: 'Name, email, and phone are required'
            });
        }

        const isAdminPractice = body.isAdminPractice === true || body.adminPractice === true;
        const store = getAssessmentStore(context);
        const candidate = await getCandidate(store, email);

        if (!isAdminPractice) {
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
        }

        // Writing section lives under emailWriting only (never overwrites contact email)
        const emailWriting = asObject(
            body.emailWriting || body.emailSection || body.emailAssessment
        );

        const submission = {
            email,
            fullName,
            phone,
            attemptNumber,
            registeredAt: body.registeredAt || new Date().toISOString(),
            durationMinutes: body.durationMinutes ?? null,
            timedOut: !!body.timedOut,
            terminatedReason: body.terminatedReason || null,
            tabSwitchCount: Number(body.tabSwitchCount) || 0,
            oddman: asObject(body.oddman),
            scenarios: asObject(body.scenarios),
            grammar: asObject(body.grammar),
            fillBlank: asObject(body.fillBlank),
            englishPercent: Number(body.englishPercent) || 0,
            reading: asObject(body.reading),
            workplace: asObject(body.workplace),
            emailWriting,
            // Alias for admin UI that still reads submission.email as writing scores when object-shaped
            emailAssessment: emailWriting,
            typing: asObject(body.typing),
            voice: asObject(body.voice),
            overallScore: Number(body.overallScore) || 0
        };

        if (isAdminPractice) {
            // Unlimited admin practice — store under practice log, never block candidates
            submission.isAdminPractice = true;
            try {
                const key = `practice:${email}:${Date.now()}`;
                await store.set(key, JSON.stringify({
                    ...submission,
                    completedAt: new Date().toISOString()
                }));
            } catch (err) {
                console.error('admin practice store error:', err);
            }
            return jsonResponse(200, {
                success: true,
                attemptNumber,
                adminPractice: true,
                message: 'Admin practice attempt saved (does not count as a candidate submission).'
            });
        }

        const saved = await saveSubmission(store, submission);
        if (!saved.ok) {
            if (saved.reason === 'store_error') {
                return jsonResponse(500, {
                    error: 'store_error',
                    message: 'Could not save to storage. Please retry.',
                    detail: saved.detail || null
                });
            }
            const messages = {
                attempt1_exists: 'This email has already completed Attempt 1.',
                attempt1_required: 'Attempt 1 must be completed first.',
                attempt2_not_enabled: 'Second attempt is not enabled for this email.',
                attempt2_exists: 'This email has already completed Attempt 2.',
                invalid_email: 'Invalid email address.',
                invalid_attempt: 'Invalid attempt number.'
            };
            return jsonResponse(403, {
                error: 'blocked',
                message: messages[saved.reason] || 'Submission blocked.',
                reason: saved.reason
            });
        }

        return jsonResponse(200, {
            success: true,
            attemptNumber,
            message: `Attempt ${attemptNumber} submitted successfully`
        });
    } catch (err) {
        console.error('submit-assessment error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Server error while saving assessment. Please retry.',
            detail: err.message
        });
    }
};
