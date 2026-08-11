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
        const form1 = document.getElementById('register-form');
        const form2 = document.getElementById('register-form-attempt2');
        const alert = document.getElementById('register-alert');
        const blocked = document.getElementById('blocked-notice');

        async function handleSubmit(e, attemptNumber) {
            e.preventDefault();
            const form = e.target;
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
            const defaultLabel = button.textContent;
            button.disabled = true;
            button.textContent = 'Checking eligibility...';

            try {
                const { ok, data } = await window.TrinitasAPI.checkEligibility(email, attemptNumber);

                if (!ok && data.error) {
                    throw new Error(data.error);
                }

                if (data.blocked || data.eligible === false) {
                    if (blocked) {
                        blocked.textContent = data.message || 'You are not eligible for this attempt right now.';
                        blocked.hidden = false;
                    }
                    button.disabled = false;
                    button.textContent = defaultLabel;
                    return;
                }

                const session = {
                    fullName,
                    email,
                    phone,
                    attemptNumber,
                    registeredAt: new Date().toISOString()
                };
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                window.location.href = 'assessment.html';
            } catch {
                showAlert(alert, 'Unable to verify eligibility. Ensure the site is deployed on Netlify with serverless functions enabled, then try again.', 'error');
                button.disabled = false;
                button.textContent = defaultLabel;
            }
        }

        if (form1) form1.addEventListener('submit', e => handleSubmit(e, 1));
        if (form2) form2.addEventListener('submit', e => handleSubmit(e, 2));
    }

    function initAttempt2Nav() {
        const section = document.getElementById('attempt2');
        const registerSection = document.getElementById('register');
        if (!section) return;

        function showAttempt2(show) {
            section.hidden = !show;
            if (registerSection) registerSection.hidden = show;
            if (show) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const first = section.querySelector('input');
                if (first) setTimeout(() => first.focus(), 400);
            } else if (registerSection) {
                registerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function syncHash() {
            showAttempt2(window.location.hash === '#attempt2');
        }

        window.addEventListener('hashchange', syncHash);
        syncHash();
    }

    function initCvSubmit() {
        const form = document.getElementById('cv-form');
        const alert = document.getElementById('cv-alert');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;

            const fullName = form.fullName.value.trim();
            const email = form.email.value.trim().toLowerCase();
            const phone = form.phone.value.trim();
            const role = form.role.value;
            const notes = form.notes.value.trim();
            const consent = form.consent.checked;
            const fileInput = document.getElementById('cvFile');
            const file = fileInput && fileInput.files && fileInput.files[0];

            if (!fullName || !email || !phone || !consent) {
                showAlert(alert, 'Please complete all required fields and accept the consent.', 'error');
                return;
            }
            if (!file) {
                showAlert(alert, 'Please attach your resume (PDF or Word).', 'error');
                return;
            }
            if (file.size > 1.5 * 1024 * 1024) {
                showAlert(alert, 'File is too large. Please keep your resume under 1.5 MB.', 'error');
                return;
            }

            const button = form.querySelector('button[type="submit"]');
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Uploading…';

            try {
                const fileBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('read-failed'));
                    reader.readAsDataURL(file);
                });

                const res = await fetch('/.netlify/functions/submit-resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName,
                        email,
                        phone,
                        role,
                        notes,
                        fileName: file.name,
                        fileType: file.type || 'application/pdf',
                        fileBase64
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Submission failed. Please try again.', 'error');
                    button.disabled = false;
                    button.textContent = label;
                    return;
                }
                showAlert(alert, data.message || 'Resume submitted successfully.', 'success');
                form.reset();
            } catch {
                showAlert(alert, 'Unable to submit right now. Please try again shortly.', 'error');
            }
            button.disabled = false;
            button.textContent = label;
        });
    }

    function initResume() {
        const form = document.getElementById('resume-form');
        const alert = document.getElementById('resume-alert');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const email = form.email.value.trim().toLowerCase();
            const otp = form.otp.value.trim();
            if (!email || !/^\d{6}$/.test(otp)) {
                showAlert(alert, 'Enter your email and the 6-digit OTP from your inbox.', 'error');
                return;
            }
            const button = form.querySelector('button[type="submit"]');
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Verifying…';
            try {
                const { ok, data } = await window.TrinitasAPI.resumeAssessment(email, otp);
                if (!ok || !data.snapshot) {
                    showAlert(alert, data.message || 'Could not resume. Check email and OTP.', 'error');
                    button.disabled = false;
                    button.textContent = label;
                    return;
                }
                sessionStorage.setItem('trinitas_resume_snapshot', JSON.stringify(data.snapshot));
                window.location.href = 'assessment.html';
            } catch {
                showAlert(alert, 'Unable to resume right now. Try again shortly.', 'error');
                button.disabled = false;
                button.textContent = label;
            }
        });

        if (window.location.hash === '#resume') {
            document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initRegistration();
        initAttempt2Nav();
        initCvSubmit();
        initResume();
    });
})();