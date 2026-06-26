(function () {
    'use strict';

    const API_BASE = '/.netlify/functions';

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    window.TrinitasAPI = {
        async checkEligibility(email) {
            return request('/check-eligibility', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },
        async submitAssessment(payload) {
            return request('/submit-assessment', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
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
        }
    };
})();