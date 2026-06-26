(function () {
    'use strict';

    const API_BASE = '/.netlify/functions';
    const FORM_EMAIL = 'info@trinitasnxt.in';
    const COMPLETED_KEY = 'trinitas_completed_emails';

    function getCompletedEmails() {
        try {
            return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function markEmailCompleted(email) {
        const list = getCompletedEmails();
        const normalized = email.trim().toLowerCase();
        if (!list.includes(normalized)) {
            list.push(normalized);
            localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
        }
    }

    function clearEmailCompleted(email) {
        const normalized = email.trim().toLowerCase();
        const list = getCompletedEmails().filter(e => e !== normalized);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
    }

    function isLocallyBlocked(email) {
        return getCompletedEmails().includes(email.trim().toLowerCase());
    }

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await response.json().catch(() => ({})) : {};
        return { ok: response.ok, status: response.status, data, isJson };
    }

    async function submitViaFormSubmit(payload) {
        const response = await fetch(`https://formsubmit.co/ajax/${FORM_EMAIL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                _subject: `Career Assessment — ${payload.fullName}`,
                _template: 'table',
                _captcha: 'false',
                name: payload.fullName,
                email: payload.email,
                phone: payload.phone,
                overall_score: `${payload.overallScore}%`,
                grammar_score: `${payload.grammar?.percent || 0}%`,
                fill_blank_score: `${payload.fillBlank?.percent || 0}%`,
                english_score: `${payload.englishPercent || 0}%`,
                typing_wpm: `${payload.typing?.bestWpm || 0}`,
                typing_accuracy: `${payload.typing?.bestAccuracy || 0}%`,
                voice_completion: `${payload.voice?.completionPercent || 0}%`,
                duration_minutes: payload.durationMinutes || '',
                tab_switches: payload.tabSwitchCount ?? 0,
                terminated_reason: payload.terminatedReason || '',
                assessment_details: JSON.stringify(payload, null, 2)
            })
        });
        const data = await response.json().catch(() => ({}));
        return response.ok && data.success !== false;
    }

    window.TrinitasAPI = {
        async checkEligibility(email) {
            const normalized = email.trim().toLowerCase();
            if (isLocallyBlocked(normalized)) {
                return {
                    ok: true,
                    data: {
                        eligible: false,
                        blocked: true,
                        message: 'This email has already completed the assessment. Reattempts are not permitted.'
                    }
                };
            }

            const result = await request('/check-eligibility', {
                method: 'POST',
                body: JSON.stringify({ email: normalized })
            });

            if (!result.isJson || result.status === 404) {
                return { ok: true, data: { eligible: true, blocked: false, fallback: true } };
            }
            return result;
        },

        async submitAssessment(payload) {
            const normalized = { ...payload, email: payload.email.trim().toLowerCase() };

            const result = await request('/submit-assessment', {
                method: 'POST',
                body: JSON.stringify(normalized)
            });

            if (result.ok && result.data.success) {
                markEmailCompleted(normalized.email);
                return { ok: true, data: { ...result.data, via: 'netlify' } };
            }

            if (result.status === 403 && result.data.error === 'blocked') {
                markEmailCompleted(normalized.email);
                return { ok: false, data: result.data };
            }

            const emailed = await submitViaFormSubmit(normalized);
            if (emailed) {
                markEmailCompleted(normalized.email);
                return { ok: true, data: { success: true, via: 'email' } };
            }

            return {
                ok: false,
                data: { error: 'submit-failed', message: 'Submission failed. Please email info@trinitasnxt.in directly.' }
            };
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
        }
    };
})();