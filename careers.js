(function () {
    'use strict';

    const SESSION_KEY = 'trinitas_assessment_session';
    const CANDIDATE_KEY = 'trinitas_candidate_auth';

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

        const groups = document.querySelectorAll('.nav-group');
        groups.forEach(group => {
            const btn = group.querySelector('.nav-group-toggle');
            if (!btn) return;
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const open = !group.classList.contains('open');
                groups.forEach(g => g.classList.remove('open'));
                group.classList.toggle('open', open);
                btn.setAttribute('aria-expanded', String(open));
            });
        });
        document.addEventListener('click', () => {
            groups.forEach(g => {
                g.classList.remove('open');
                const b = g.querySelector('.nav-group-toggle');
                if (b) b.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function showAlert(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = `form-alert form-alert--${type}`;
        el.hidden = false;
    }

    function getCandidate() {
        try {
            return JSON.parse(sessionStorage.getItem(CANDIDATE_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function setCandidate(data) {
        sessionStorage.setItem(CANDIDATE_KEY, JSON.stringify(data));
    }

    function clearCandidate() {
        sessionStorage.removeItem(CANDIDATE_KEY);
    }

    function passwordChecks(pw) {
        return {
            length: pw.length >= 12,
            number: /\d/.test(pw),
            special: /[^A-Za-z0-9]/.test(pw)
        };
    }

    function passwordStrength(pw) {
        const checks = passwordChecks(pw);
        let score = 0;
        if (pw.length >= 12) score += 25;
        if (pw.length >= 16) score += 10;
        if (checks.number) score += 20;
        if (checks.special) score += 20;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 15;
        if (pw.length >= 14 && checks.number && checks.special) score += 10;
        score = Math.min(100, score);

        let label = 'Too weak';
        let level = 'weak';
        if (score >= 85) { label = 'Strong'; level = 'strong'; }
        else if (score >= 65) { label = 'Good'; level = 'good'; }
        else if (score >= 40) { label = 'Fair'; level = 'fair'; }
        else if (pw.length > 0) { label = 'Weak'; level = 'weak'; }
        else { label = 'Enter a password'; level = 'empty'; }

        const valid = checks.length && checks.number && checks.special;
        return { score, label, level, checks, valid };
    }

    function initPasswordStrength() {
        const input = document.getElementById('suPassword');
        const fill = document.getElementById('pw-strength-fill');
        const label = document.getElementById('pw-strength-label');
        const rules = document.getElementById('pw-rules');
        if (!input || !fill || !label) return;

        function update() {
            const s = passwordStrength(input.value);
            fill.style.width = `${s.score}%`;
            fill.className = '';
            fill.id = 'pw-strength-fill';
            fill.classList.add(`pw-fill--${s.level}`);
            label.textContent = s.label === 'Enter a password' ? s.label : `Strength: ${s.label} (${s.score}%)`;
            label.className = `pw-strength-label pw-label--${s.level}`;
            if (rules) {
                rules.querySelectorAll('[data-rule]').forEach(li => {
                    const key = li.dataset.rule;
                    li.classList.toggle('pw-rule--ok', !!s.checks[key]);
                });
            }
        }
        input.addEventListener('input', update);
        update();
    }

    function updateChecklist(candidate) {
        document.querySelectorAll('#careers-checklist [data-step]').forEach(li => {
            const step = li.dataset.step;
            let done = false;
            if (candidate) {
                if (step === 'account' || step === 'signin') done = true;
            }
            li.classList.toggle('is-done', done);
        });
    }

    function showLoggedIn(candidate) {
        const auth = document.getElementById('auth-panels');
        const panel = document.getElementById('logged-in-panel');
        if (auth) auth.hidden = true;
        if (panel) panel.hidden = false;
        const nameEl = document.getElementById('logged-name');
        const metaEl = document.getElementById('logged-meta');
        const refEl = document.getElementById('logged-ref');
        if (nameEl) nameEl.textContent = candidate.fullName || candidate.username;
        if (metaEl) {
            metaEl.textContent = `@${candidate.username} · ${candidate.email}${candidate.phone ? ' · ' + candidate.phone : ''}`;
        }
        if (refEl) {
            if (candidate.referenceId) {
                refEl.hidden = false;
                refEl.innerHTML = `Your reference ID: <strong>${candidate.referenceId}</strong> — keep this for recruitment communications.`;
            } else {
                refEl.hidden = true;
            }
        }
        const resumeEmail = document.getElementById('resumeEmail');
        if (resumeEmail && candidate.email) resumeEmail.value = candidate.email;
        updateChecklist(candidate);
    }

    function showAuthPanels() {
        const auth = document.getElementById('auth-panels');
        const panel = document.getElementById('logged-in-panel');
        if (auth) auth.hidden = false;
        if (panel) panel.hidden = true;
        const forgot = document.getElementById('panel-forgot');
        if (forgot) forgot.hidden = true;
        const signup = document.getElementById('panel-signup');
        const signin = document.getElementById('panel-signin');
        const activeTab = document.querySelector('.careers-tab--active');
        const panelName = activeTab?.dataset?.panel || 'signup';
        if (signup) signup.hidden = panelName !== 'signup';
        if (signin) signin.hidden = panelName !== 'signin';
    }

    function showForgotPanel() {
        document.getElementById('panel-signup').hidden = true;
        document.getElementById('panel-signin').hidden = true;
        document.getElementById('panel-forgot').hidden = false;
        document.querySelectorAll('.careers-tab').forEach(t => t.classList.remove('careers-tab--active'));
    }

    function initTabs() {
        document.querySelectorAll('.careers-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.careers-tab').forEach(t => t.classList.remove('careers-tab--active'));
                tab.classList.add('careers-tab--active');
                const panel = tab.dataset.panel;
                document.getElementById('panel-signup').hidden = panel !== 'signup';
                document.getElementById('panel-signin').hidden = panel !== 'signin';
                const forgot = document.getElementById('panel-forgot');
                if (forgot) forgot.hidden = true;
            });
        });
    }

    function initSignup() {
        const form = document.getElementById('signup-form');
        const alert = document.getElementById('signup-alert');
        if (!form) return;

        const referredSelect = document.getElementById('suReferredBy');
        const detailWrap = document.getElementById('referred-detail-wrap');
        if (referredSelect && detailWrap) {
            const toggleDetail = () => {
                const v = referredSelect.value;
                const show = v === 'Employee referral' || v === 'Friends';
                detailWrap.hidden = !show;
            };
            referredSelect.addEventListener('change', toggleDetail);
            toggleDetail();
        }

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;

            const fullName = form.fullName.value.trim();
            const email = form.email.value.trim().toLowerCase();
            const phone = form.phone.value.trim();
            const username = form.username.value.trim().toLowerCase();
            const password = form.password.value;
            const role = form.role.value;
            const referredBy = (form.referredBy?.value || '').trim();
            const referredDetail = (form.referredDetail?.value || '').trim();
            const notes = form.notes.value.trim();
            const consent = form.consent.checked;
            const file = document.getElementById('suFile')?.files?.[0];

            const strength = passwordStrength(password);
            if (!fullName || !email || !phone || !username || !consent) {
                showAlert(alert, 'Please complete all required fields and accept the consent.', 'error');
                return;
            }
            if (!referredBy) {
                showAlert(alert, 'Please tell us how you heard about Trinitas.', 'error');
                return;
            }
            if (!strength.valid) {
                showAlert(alert, 'Password must be at least 12 characters with 1 number and 1 special character.', 'error');
                return;
            }
            if (!file) {
                showAlert(alert, 'Please attach your resume (PDF or Word).', 'error');
                return;
            }
            if (file.size > 1.5 * 1024 * 1024) {
                showAlert(alert, 'Resume must be under 1.5 MB.', 'error');
                return;
            }

            const button = document.getElementById('signup-btn');
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Creating account…';

            try {
                const fileBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('read-failed'));
                    reader.readAsDataURL(file);
                });

                const res = await fetch('/.netlify/functions/candidate-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName,
                        email,
                        phone,
                        username,
                        password,
                        role,
                        referredBy,
                        referredDetail,
                        notes,
                        fileName: file.name,
                        fileType: file.type || 'application/pdf',
                        fileBase64
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Registration failed.', 'error');
                    button.disabled = false;
                    button.textContent = label;
                    return;
                }

                if (data.token) {
                    setCandidate({
                        token: data.token,
                        username: data.username,
                        fullName: data.fullName,
                        email: data.email,
                        phone: data.phone,
                        referenceId: data.referenceId || null
                    });
                    showLoggedIn(getCandidate());
                    if (data.referenceId) {
                        showAlert(alert, `Account created. Reference ID: ${data.referenceId}`, 'success');
                    }
                } else {
                    showAlert(alert, data.message || 'Account created. Please sign in.', 'success');
                    document.querySelector('.careers-tab[data-panel="signin"]')?.click();
                }
            } catch {
                showAlert(alert, 'Unable to register right now. Please try again shortly.', 'error');
            }
            button.disabled = false;
            button.textContent = label;
        });
    }

    function initSignin() {
        const form = document.getElementById('signin-form');
        const alert = document.getElementById('signin-alert');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const username = form.username.value.trim().toLowerCase();
            const password = form.password.value;
            const button = form.querySelector('button[type="submit"]');
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Signing in…';

            try {
                const res = await fetch('/.netlify/functions/candidate-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    showAlert(alert, data.error || data.message || 'Sign-in failed.', 'error');
                    button.disabled = false;
                    button.textContent = label;
                    return;
                }
                setCandidate({
                    token: data.token,
                    username: data.username,
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    referenceId: data.referenceId || null
                });
                showLoggedIn(getCandidate());
            } catch {
                showAlert(alert, 'Unable to sign in right now.', 'error');
            }
            button.disabled = false;
            button.textContent = label;
        });

        document.getElementById('show-forgot-password')?.addEventListener('click', () => {
            showForgotPanel();
        });
    }

    function initForgotPassword() {
        const form = document.getElementById('forgot-form');
        const alert = document.getElementById('forgot-alert');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const username = form.username.value.trim().toLowerCase();
            const email = form.email.value.trim().toLowerCase();
            const password = form.password.value;
            const strength = passwordStrength(password);
            if (!username || !email) {
                showAlert(alert, 'Enter your username and registered email.', 'error');
                return;
            }
            if (!strength.valid) {
                showAlert(alert, 'Password must be at least 12 characters with 1 number and 1 special character.', 'error');
                return;
            }
            const button = form.querySelector('button[type="submit"]');
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Updating…';
            try {
                const res = await fetch('/.netlify/functions/candidate-reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Could not reset password.', 'error');
                    button.disabled = false;
                    button.textContent = label;
                    return;
                }
                showAlert(alert, data.message || 'Password updated. You can sign in now.', 'success');
                form.reset();
            } catch {
                showAlert(alert, 'Unable to reset password right now.', 'error');
            }
            button.disabled = false;
            button.textContent = label;
        });

        document.getElementById('back-to-signin')?.addEventListener('click', () => {
            document.getElementById('panel-forgot').hidden = true;
            document.querySelectorAll('.careers-tab').forEach(t => {
                t.classList.toggle('careers-tab--active', t.dataset.panel === 'signin');
            });
            document.getElementById('panel-signup').hidden = true;
            document.getElementById('panel-signin').hidden = false;
        });
    }

    async function startAttempt(attemptNumber) {
        const candidate = getCandidate();
        const alert = document.getElementById('register-alert');
        const blocked = document.getElementById('blocked-notice');
        if (!candidate) {
            showAuthPanels();
            return;
        }
        if (blocked) blocked.hidden = true;
        if (alert) alert.hidden = true;

        const btn = document.getElementById(attemptNumber === 2 ? 'btn-attempt2' : 'btn-attempt1');
        const label = btn?.textContent;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Checking eligibility…';
        }

        try {
            const { ok, data } = await window.TrinitasAPI.checkEligibility(candidate.email, attemptNumber);
            if (!ok && data.error) throw new Error(data.error);

            if (data.blocked || data.eligible === false) {
                if (blocked) {
                    blocked.textContent = data.message || 'You are not eligible for this attempt right now.';
                    blocked.hidden = false;
                }
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = label;
                }
                return;
            }

            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                fullName: candidate.fullName,
                email: candidate.email,
                phone: candidate.phone,
                username: candidate.username,
                referenceId: candidate.referenceId || null,
                attemptNumber,
                registeredAt: new Date().toISOString()
            }));
            window.location.href = 'assessment.html';
        } catch {
            showAlert(alert, 'Unable to verify eligibility. Ensure the site is deployed with serverless functions, then try again.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = label;
            }
        }
    }

    function initAttempts() {
        document.getElementById('btn-attempt1')?.addEventListener('click', () => startAttempt(1));
        document.getElementById('btn-attempt2')?.addEventListener('click', () => startAttempt(2));
        document.getElementById('candidate-logout')?.addEventListener('click', () => {
            clearCandidate();
            showAuthPanels();
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
                showAlert(alert, 'Enter your email and the 6-digit OTP.', 'error');
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
                showAlert(alert, 'Unable to resume right now.', 'error');
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
        initTabs();
        initPasswordStrength();
        initSignup();
        initSignin();
        initForgotPassword();
        initAttempts();
        initResume();

        const existing = getCandidate();
        if (existing?.token && existing?.username) {
            showLoggedIn(existing);
        } else {
            showAuthPanels();
        }
        try {
            sessionStorage.removeItem('trinitas_pending_verify');
        } catch {
            /* ignore */
        }
    });
})();
