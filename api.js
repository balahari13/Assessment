(function () {
    'use strict';

    const API_BASE = '/.netlify/functions';
    const FORM_EMAIL = 'info@trinitasnxt.in';
    const COMPLETED_KEY = 'trinitas_completed_attempts';
    const LEGACY_COMPLETED_KEY = 'trinitas_completed_emails';

    function migrateLegacyCompleted() {
        try {
            const legacy = JSON.parse(localStorage.getItem(LEGACY_COMPLETED_KEY) || '[]');
            if (!legacy.length) return;
            const map = getCompletedMap();
            legacy.forEach(email => {
                const normalized = String(email).trim().toLowerCase();
                if (!map[normalized]) map[normalized] = [1];
            });
            localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
            localStorage.removeItem(LEGACY_COMPLETED_KEY);
        } catch {
            /* ignore */
        }
    }

    migrateLegacyCompleted();

    function getCompletedMap() {
        try {
            return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function markEmailCompleted(email, attemptNumber = 1) {
        const map = getCompletedMap();
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized.includes('@')) return;
        if (!map[normalized]) map[normalized] = [];
        const attempt = Number(attemptNumber) || 1;
        if (!map[normalized].includes(attempt)) {
            map[normalized].push(attempt);
            localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
        }
    }

    function clearEmailCompleted(email, attemptNumber) {
        const normalized = String(email || '').trim().toLowerCase();
        const map = getCompletedMap();
        if (!map[normalized]) return;
        if (attemptNumber) {
            map[normalized] = map[normalized].filter(a => a !== Number(attemptNumber));
            if (!map[normalized].length) delete map[normalized];
        } else {
            delete map[normalized];
        }
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
    }

    function isLocallyBlocked(email, attemptNumber = 1) {
        const map = getCompletedMap();
        const normalized = String(email || '').trim().toLowerCase();
        return (map[normalized] || []).includes(Number(attemptNumber) || 1);
    }

    async function request(path, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${path}`, {
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                ...options
            });
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            let data = {};
            if (isJson) {
                data = await response.json().catch(() => ({}));
            } else {
                const text = await response.text().catch(() => '');
                data = { error: 'non-json', message: text.slice(0, 200) || `HTTP ${response.status}` };
            }
            return { ok: response.ok, status: response.status, data, isJson };
        } catch (err) {
            return {
                ok: false,
                status: 0,
                data: { error: 'network', message: err.message || 'Network error' },
                isJson: false
            };
        }
    }

    async function submitViaFormSubmit(payload) {
        try {
            const attemptLabel = payload.attemptNumber === 2 ? 'Attempt 2' : 'Attempt 1';
            const response = await fetch(`https://formsubmit.co/ajax/${FORM_EMAIL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    _subject: `Career Assessment ${attemptLabel} — ${payload.fullName}`,
                    _template: 'table',
                    _captcha: 'false',
                    attempt: attemptLabel,
                    name: payload.fullName,
                    email: payload.email,
                    phone: payload.phone,
                    overall_score: `${payload.overallScore}%`,
                    english_score: `${payload.englishPercent || 0}%`,
                    reading_score: `${payload.reading?.percent || 0}%`,
                    workplace_score: `${payload.workplace?.percent || 0}%`,
                    email_writing_score: `${payload.emailWriting?.percent || 0}%`,
                    typing_wpm: `${payload.typing?.bestWpm || 0}`,
                    typing_accuracy: `${payload.typing?.bestAccuracy || 0}%`,
                    voice_completion: `${payload.voice?.completionPercent || 0}%`,
                    duration_minutes: payload.durationMinutes || '',
                    tab_switches: payload.tabSwitchCount ?? 0,
                    terminated_reason: payload.terminatedReason || ''
                })
            });
            const data = await response.json().catch(() => ({}));
            return response.ok && data.success !== false;
        } catch {
            return false;
        }
    }

    function resolveContactEmail(payload) {
        const candidates = [
            payload.candidateEmail,
            payload.contactEmail,
            typeof payload.email === 'string' ? payload.email : null
        ];
        for (const c of candidates) {
            const s = String(c || '').trim().toLowerCase();
            if (s.includes('@')) return s;
        }
        return '';
    }

    window.TrinitasAPI = {
        async checkEligibility(email, attemptNumber = 1) {
            const normalized = String(email || '').trim().toLowerCase();
            const attempt = Number(attemptNumber) || 1;

            if (isLocallyBlocked(normalized, attempt)) {
                return {
                    ok: true,
                    data: {
                        eligible: false,
                        blocked: true,
                        attemptNumber: attempt,
                        message: attempt === 2
                            ? 'This email has already completed Attempt 2.'
                            : 'This email has already completed Attempt 1.'
                    }
                };
            }

            const result = await request('/check-eligibility', {
                method: 'POST',
                body: JSON.stringify({ email: normalized, attemptNumber: attempt })
            });

            if (!result.isJson || result.status === 404) {
                return { ok: true, data: { eligible: true, blocked: false, attemptNumber: attempt, fallback: true } };
            }
            return result;
        },

        async submitAssessment(payload) {
            try {
                const contactEmail = resolveContactEmail(payload);
                const writing = (payload.emailWriting && typeof payload.emailWriting === 'object')
                    ? payload.emailWriting
                    : {};

                const finalBody = {
                    fullName: String(payload.fullName || '').trim(),
                    email: contactEmail,
                    candidateEmail: contactEmail,
                    contactEmail,
                    phone: String(payload.phone || '').trim(),
                    attemptNumber: Number(payload.attemptNumber) || 1,
                    registeredAt: payload.registeredAt || null,
                    durationMinutes: payload.durationMinutes ?? null,
                    timedOut: !!payload.timedOut,
                    terminatedReason: payload.terminatedReason || null,
                    tabSwitchCount: Number(payload.tabSwitchCount) || 0,
                    overallScore: Number(payload.overallScore) || 0,
                    grammar: payload.grammar || {},
                    fillBlank: payload.fillBlank || {},
                    englishPercent: Number(payload.englishPercent) || 0,
                    reading: payload.reading || {},
                    workplace: payload.workplace || {},
                    emailWriting: writing,
                    typing: payload.typing || {},
                    voice: payload.voice || {}
                };

                if (!finalBody.email || !finalBody.fullName || !finalBody.phone) {
                    return {
                        ok: false,
                        data: {
                            error: 'validation',
                            message: 'Missing name, email, or phone. Please re-register from Careers and try again.'
                        }
                    };
                }

                // Primary: Netlify function + Blobs
                const result = await request('/submit-assessment', {
                    method: 'POST',
                    body: JSON.stringify(finalBody)
                });

                if (result.ok && result.data && result.data.success === true) {
                    markEmailCompleted(finalBody.email, finalBody.attemptNumber);
                    return { ok: true, data: { ...result.data, via: 'netlify' } };
                }

                // Already submitted — treat as success so the candidate does not lose their work
                if (result.status === 403 && result.data && result.data.error === 'blocked') {
                    const msg = String(result.data.message || '');
                    if (/already completed/i.test(msg)) {
                        markEmailCompleted(finalBody.email, finalBody.attemptNumber);
                        return {
                            ok: true,
                            data: { success: true, via: 'already-saved', message: msg }
                        };
                    }
                    return { ok: false, data: result.data };
                }

                // Fallback: email notification (scores summary)
                const formOk = await submitViaFormSubmit({
                    fullName: finalBody.fullName,
                    email: finalBody.email,
                    phone: finalBody.phone,
                    attemptNumber: finalBody.attemptNumber,
                    overallScore: finalBody.overallScore,
                    englishPercent: finalBody.englishPercent,
                    reading: finalBody.reading,
                    workplace: finalBody.workplace,
                    emailWriting: finalBody.emailWriting,
                    typing: finalBody.typing,
                    voice: finalBody.voice,
                    durationMinutes: finalBody.durationMinutes,
                    tabSwitchCount: finalBody.tabSwitchCount,
                    terminatedReason: finalBody.terminatedReason
                });

                if (formOk) {
                    markEmailCompleted(finalBody.email, finalBody.attemptNumber);
                    return { ok: true, data: { success: true, via: 'email' } };
                }

                return {
                    ok: false,
                    data: {
                        error: 'submit-failed',
                        message: result.data?.message || result.data?.detail ||
                            (result.status ? `Server returned ${result.status}. Please retry.` : 'Network error. Please check your connection and retry.')
                    }
                };
            } catch (err) {
                return {
                    ok: false,
                    data: { error: 'submit-failed', message: err.message || 'Submission failed unexpectedly.' }
                };
            }
        },

        async adminLogin(username, password) {
            return request('/admin-login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async adminResults(token) {
            return request('/admin-results', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });
        },

        async adminDelete(token, email) {
            return request('/admin-delete', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email })
            });
        },

        async adminReattempt(token, email) {
            const result = await request('/admin-reattempt', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email })
            });
            if (result.ok) clearEmailCompleted(email);
            return result;
        },

        async adminEnableAttempt2(token, email) {
            return request('/admin-enable-attempt2', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email })
            });
        }
    };
})();
