import {
    corsHeaders,
    jsonResponse,
    getAssessmentStore,
    normalizeEmail,
    saveSubmission,
    getCandidate,
    generateReferenceId
} from './lib/shared.mjs';
import { serverScoreSubmission } from './lib/score.mjs';
import { writeAudit } from './lib/audit.mjs';

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export default async (req, context) => {
    const origin = req.headers.get('origin') || req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' }, origin);
    }

    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return jsonResponse(400, { error: 'Invalid JSON body' }, origin);
        }

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
            }, origin);
        }

        const isAdminPractice = body.isAdminPractice === true || body.adminPractice === true;
        const store = getAssessmentStore(context);
        const candidate = await getCandidate(store, email);

        if (!isAdminPractice) {
            if (attemptNumber === 1 && candidate?.attempt1) {
                return jsonResponse(403, {
                    error: 'blocked',
                    message: 'This email has already completed Attempt 1.'
                }, origin);
            }

            if (attemptNumber === 2) {
                if (!candidate?.attempt1) {
                    return jsonResponse(403, {
                        error: 'blocked',
                        message: 'Attempt 1 must be completed before Attempt 2.'
                    }, origin);
                }
                if (!candidate.attempt2Enabled) {
                    return jsonResponse(403, {
                        error: 'blocked',
                        message: 'Second attempt is not enabled for this email.'
                    }, origin);
                }
                if (candidate.attempt2) {
                    return jsonResponse(403, {
                        error: 'blocked',
                        message: 'This email has already completed Attempt 2.'
                    }, origin);
                }
            }
        }

        const scored = serverScoreSubmission(body, attemptNumber);
        const referenceId = body.referenceId || candidate?.referenceId || generateReferenceId();

        const submission = {
            email,
            fullName,
            phone,
            attemptNumber,
            referenceId,
            registeredAt: body.registeredAt || new Date().toISOString(),
            durationMinutes: body.durationMinutes ?? null,
            timedOut: !!body.timedOut,
            terminatedReason: body.terminatedReason || null,
            tabSwitchCount: Number(body.tabSwitchCount) || 0,
            consentAccepted: !!body.consentAccepted,
            deviceWarningAcknowledged: !!body.deviceWarningAcknowledged,
            oddman: scored.oddman,
            scenarios: scored.scenarios,
            grammar: scored.grammar,
            fillBlank: scored.fillBlank,
            englishPercent: scored.englishPercent,
            reading: scored.reading,
            workplace: scored.workplace,
            emailWriting: scored.emailWriting,
            emailAssessment: scored.emailWriting,
            typing: scored.typing,
            voice: scored.voice,
            overallScore: scored.overallScore,
            serverScored: true,
            scoredAt: scored.scoredAt,
            // Keep raw client score for discrepancy review only
            clientOverallScore: Number(body.overallScore) || null
        };

        if (isAdminPractice) {
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
                referenceId,
                message: 'Admin practice attempt saved (does not count as a candidate submission).'
            }, origin);
        }

        const saved = await saveSubmission(store, submission);
        if (!saved.ok) {
            if (saved.reason === 'store_error') {
                return jsonResponse(500, {
                    error: 'store_error',
                    message: 'Could not save to storage. Please retry.',
                    detail: saved.detail || null
                }, origin);
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
            }, origin);
        }

        await writeAudit(store, {
            actor: email,
            role: 'candidate',
            action: 'assessment_submit',
            target: email,
            meta: {
                attemptNumber,
                referenceId,
                overallScore: submission.overallScore,
                tabSwitchCount: submission.tabSwitchCount
            }
        });

        return jsonResponse(200, {
            success: true,
            attemptNumber,
            referenceId,
            message: `Attempt ${attemptNumber} submitted successfully. Reference: ${referenceId}`
        }, origin);
    } catch (err) {
        console.error('submit-assessment error:', err);
        return jsonResponse(500, {
            error: 'Server error',
            message: 'Server error while saving assessment. Please retry.',
            detail: err.message
        }, origin);
    }
};
