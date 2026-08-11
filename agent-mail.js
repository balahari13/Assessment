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

    function initTabs() {
        const tabs = document.querySelectorAll('.agent-tab');
        const reg = document.getElementById('panel-register');
        const login = document.getElementById('panel-login');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('agent-tab--active'));
                tab.classList.add('agent-tab--active');
                const which = tab.dataset.tab;
                reg.hidden = which !== 'register';
                login.hidden = which !== 'login';
            });
        });
    }

    function initRegister() {
        const form = document.getElementById('agent-register-form');
        const alert = document.getElementById('reg-alert');
        const success = document.getElementById('reg-success');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            alert.hidden = true;
            success.hidden = true;
            const fullName = form.fullName.value.trim();
            const phone = form.phone.value.trim();
            const password = form.password.value;
            if (fullName.length < 3 || password.length < 6) {
                show(alert, 'Enter full name and a password of at least 6 characters.', 'error');
                return;
            }
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Creating…';
            const { ok, data } = await request('/agent-register', {
                method: 'POST',
                body: JSON.stringify({ fullName, phone, password })
            });
            btn.disabled = false;
            btn.textContent = 'Create agent mail';
            if (!ok) {
                show(alert, data.message || data.error || 'Registration failed.', 'error');
                return;
            }
            sessionStorage.setItem(TOKEN_KEY, data.token);
            success.hidden = false;
            success.className = 'form-alert form-alert--success';
            success.innerHTML = `<strong>Your agent mail:</strong> ${data.email}<br><span style="font-size:0.88rem">Save this email — it was generated from letters in your name. Redirecting to your dashboard…</span>`;
            setTimeout(() => { window.location.href = 'agent-dashboard.html'; }, 2200);
        });
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
                show(alert, data.error || 'Sign-in failed.', 'error');
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

    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        initRegister();
        initLogin();
    });
})();
