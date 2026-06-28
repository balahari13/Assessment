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
        const normalized = email.trim().toLowerCase();
        if (!map[normalized]) map[normalized] = [];
        const attempt = Number(attemptNumber) || 1;
        if (!map[normalized].includes(attempt)) {
            map[normalized].push(attempt);
            localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
        }
    }

    function clearEmailCompleted(email, attemptNumber) {
        const normalized = email.trim().toLowerCase();
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
        const normalized = email.trim().toLowerCase();
        return (map[normalized] || []).includes(Number(attemptNumber) || 1);
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
        const attemptLabel = payload.attemptNumber === 2 ? 'Attempt 2 (Advanced)' : 'Attempt 1';
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
                grammar_score: `${payload.grammar?.percent || 0}%`,
                fill_blank_score: `${payload.fillBlank?.percent || 0}%`,
                english_score: `${payload.englishPercent || 0}%`,
                reading_score: `${payload.reading?.percent || 0}%`,
                workplace_score: `${payload.workplace?.percent || 0}%`,
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
        async checkEligibility(email, attemptNumber = 1) {
            const normalized = email.trim().toLowerCase();
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
            const normalized = {
                ...payload,
                email: payload.email.trim().toLowerCase(),
                attemptNumber: Number(payload.attemptNumber) || 1
            };

            const result = await request('/submit-assessment', {
                method: 'POST',
                body: JSON.stringify(normalized)
            });

            if (result.ok && result.data.success) {
                markEmailCompleted(normalized.email, normalized.attemptNumber);
                return { ok: true, data: { ...result.data, via: 'netlify' } };
            }

            if (result.status === 403 && result.data.error === 'blocked') {
                markEmailCompleted(normalized.email, normalized.attemptNumber);
                return { ok: false, data: result.data };
            }

            const emailed = await submitViaFormSubmit(normalized);
            if (emailed) {
                markEmailCompleted(normalized.email, normalized.attemptNumber);
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