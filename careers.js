(function () {
    'use strict';

    const SESSION_KEY = 'trinitas_assessment_session';

    function initNav() {
        const nav = document.getElementById('nav');
        const toggle = document.getElementById('nav-toggle');
        const menu = document.getElementById('mobile-menu');
        if (!nav) return;

        window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));

        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                const open = menu.classList.toggle('open');
                toggle.classList.toggle('active', open);
                toggle.setAttribute('aria-expanded', String(open));
                menu.setAttribute('aria-hidden', String(!open));
                document.body.style.overflow = open ? 'hidden' : '';
            });
        }
    }

    function showAlert(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = `form-alert form-alert--${type}`;
        el.hidden = false;
    }

    function initRegistration() {
        const form = document.getElementById('register-form');
        const alert = document.getElementById('register-alert');
        const blocked = document.getElementById('blocked-notice');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (blocked) blocked.hidden = true;
            if (alert) alert.hidden = true;

            const fullName = form.fullName.value.trim();
            const email = form.email.value.trim().toLowerCase();
            const phone = form.phone.value.trim();
            const consent = form.consent.checked;

            if (!fullName || !email || !phone || !consent) {
                showAlert(alert, 'Please complete all fields and accept the terms.', 'error');
                return;
            }

            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'Checking eligibility...';

            try {
                const { ok, data } = await window.TrinitasAPI.checkEligibility(email);

                if (!ok && data.error) {
                    throw new Error(data.error);
                }

                if (data.blocked || data.eligible === false) {
                    if (blocked) {
                        blocked.textContent = data.message || 'This email has already completed the assessment. Reattempts are not permitted.';
                        blocked.hidden = false;
                    }
                    button.disabled = false;
                    button.textContent = 'Begin Assessment';
                    return;
                }

                const session = {
                    fullName,
                    email,
                    phone,
                    registeredAt: new Date().toISOString()
                };
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                window.location.href = 'assessment.html';
            } catch {
                showAlert(alert, 'Unable to verify eligibility. Ensure the site is deployed on Netlify with serverless functions enabled, then try again.', 'error');
                button.disabled = false;
                button.textContent = 'Begin Assessment';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initRegistration();
    });
})();