(function () {
    'use strict';

    const TOKEN_KEY = 'trinitas_agent_token';
    const API = '/.netlify/functions';

    async function request(path, options = {}) {
        try {
            const res = await fetch(`${API}${path}`, {
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                ...options
            });
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, data };
        } catch (err) {
            return { ok: false, data: { error: err.message || 'Network error' } };
        }
    }

    function show(el, msg, type) {
        if (!el) return;
        el.hidden = false;
        el.className = `form-alert form-alert--${type || 'error'}`;
        el.textContent = msg;
    }

    function initLogin() {
        const form = document.getElementById('agent-login-form');
        const alert = document.getElementById('login-alert');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            alert.hidden = true;
            const email = form.email.value.trim().toLowerCase();
            const password = form.password.value;
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Signing in…';
            const { ok, data } = await request('/agent-login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            btn.disabled = false;
            btn.textContent = 'Sign in';
            if (!ok) {
                show(alert, data.error || data.message || 'Sign-in failed.', 'error');
                return;
            }
            sessionStorage.setItem(TOKEN_KEY, data.token);
            window.location.href = 'agent-dashboard.html';
        });
    }

    if (sessionStorage.getItem(TOKEN_KEY)) {
        window.location.href = 'agent-dashboard.html';
        return;
    }

    document.addEventListener('DOMContentLoaded', initLogin);
})();
