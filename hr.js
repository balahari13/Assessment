(function () {
    'use strict';

    const AUTH_KEY = 'trinitas_hr_auth';
    const DEFAULT_MEET = 'https://meet.google.com/ygi-ejrk-sae';

    let stages = [];
    let meetLink = DEFAULT_MEET;

    function showAlert(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = `form-alert form-alert--${type}`;
        el.hidden = false;
    }

    function showToast(message, type) {
        const toast = document.getElementById('hr-toast');
        if (!toast) return;
        toast.className = `admin-toast admin-toast--${type || 'success'}`;
        toast.textContent = message;
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 4500);
    }

    function getAuth() {
        try {
            return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function setAuth(data) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
    }

    function clearAuth() {
        sessionStorage.removeItem(AUTH_KEY);
    }

    function token() {
        return getAuth()?.token || '';
    }

    function stageLabel(id) {
        const s = stages.find(x => x.id === id);
        return s ? s.label : id;
    }

    function showAuth() {
        const authEl = document.getElementById('hr-auth');
        const dash = document.getElementById('hr-dashboard');
        if (authEl) {
            authEl.hidden = false;
            authEl.setAttribute('aria-hidden', 'false');
        }
        if (dash) {
            dash.hidden = true;
            dash.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.add('admin-logged-out');
        document.body.classList.remove('admin-logged-in');
    }

    function showDashboard() {
        const authEl = document.getElementById('hr-auth');
        const dash = document.getElementById('hr-dashboard');
        if (authEl) {
            authEl.hidden = true;
            authEl.setAttribute('aria-hidden', 'true');
        }
        if (dash) {
            dash.hidden = false;
            dash.setAttribute('aria-hidden', 'false');
        }
        document.body.classList.remove('admin-logged-out');
        document.body.classList.add('admin-logged-in');
        const auth = getAuth();
        const label = document.getElementById('hr-user-label');
        if (label && auth) {
            label.textContent = `${auth.fullName || 'HR'} · ${auth.email || ''}`;
        }
        loadPipeline();
    }

    function initTabs() {
        document.querySelectorAll('.hr-auth-tabs .careers-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.hr-auth-tabs .careers-tab').forEach(t => t.classList.remove('careers-tab--active'));
                tab.classList.add('careers-tab--active');
                const panel = tab.dataset.panel;
                document.getElementById('panel-hr-register').hidden = panel !== 'hr-register';
                document.getElementById('panel-hr-login').hidden = panel !== 'hr-login';
            });
        });
    }

    function initRegister() {
        const form = document.getElementById('hr-register-form');
        const alert = document.getElementById('hr-reg-alert');
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const fullName = form.fullName.value.trim();
            const email = form.email.value.trim().toLowerCase();
            const phone = form.phone.value.trim();
            const password = form.password.value;
            const inviteCode = form.inviteCode.value.trim();
            if (!inviteCode) {
                showAlert(alert, 'An administrator invite code is required.', 'error');
                return;
            }
            const btn = form.querySelector('button[type="submit"]');
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Creating…';
            try {
                const { ok, data } = await window.TrinitasAPI.hrRegister({ fullName, email, phone, password, inviteCode });
                if (!ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Registration failed.', 'error');
                    btn.disabled = false;
                    btn.textContent = label;
                    return;
                }
                setAuth({
                    token: data.token,
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    role: 'hr'
                });
                showDashboard();
            } catch {
                showAlert(alert, 'Unable to register right now.', 'error');
            }
            btn.disabled = false;
            btn.textContent = label;
        });
    }

    function initLogin() {
        const form = document.getElementById('hr-login-form');
        const alert = document.getElementById('hr-login-alert');
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const email = form.email.value.trim().toLowerCase();
            const password = form.password.value;
            const btn = form.querySelector('button[type="submit"]');
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Signing in…';
            try {
                const { ok, data } = await window.TrinitasAPI.hrLogin(email, password);
                if (!ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Sign-in failed.', 'error');
                    btn.disabled = false;
                    btn.textContent = label;
                    return;
                }
                setAuth({
                    token: data.token,
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    role: 'hr'
                });
                showDashboard();
            } catch {
                showAlert(alert, 'Unable to sign in right now.', 'error');
            }
            btn.disabled = false;
            btn.textContent = label;
        });
    }

    function renderStats(items) {
        const total = items.length;
        const interview = items.filter(i => i.stage === 'interview').length;
        const decision = items.filter(i => i.stage === 'decision').length;
        const hired = items.filter(i => i.stage === 'hired').length;
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(v);
        };
        set('stat-pipe-total', total);
        set('stat-pipe-interview', interview);
        set('stat-pipe-decision', decision);
        set('stat-pipe-hired', hired);
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function stageOptions(current) {
        return stages.map(s =>
            `<option value="${s.id}" ${s.id === current ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
        ).join('');
    }

    function renderBoard(items) {
        const board = document.getElementById('pipeline-board');
        if (!board) return;
        if (!items.length) {
            board.innerHTML = '<p class="section-desc">No candidates in the pipeline yet. Add one above.</p>';
            return;
        }

        const byStage = {};
        stages.forEach(s => { byStage[s.id] = []; });
        items.forEach(item => {
            const key = byStage[item.stage] ? item.stage : 'applied';
            if (!byStage[key]) byStage[key] = [];
            byStage[key].push(item);
        });

        board.innerHTML = `
            <div class="pipeline-columns">
                ${stages.map(stage => `
                    <div class="pipeline-column" data-stage="${stage.id}">
                        <header class="pipeline-column-head">
                            <h3>${escapeHtml(stage.label)}</h3>
                            <span class="pipeline-count">${(byStage[stage.id] || []).length}</span>
                        </header>
                        <div class="pipeline-cards">
                            ${(byStage[stage.id] || []).map(item => renderCard(item)).join('') || '<p class="pipeline-empty">No candidates</p>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        board.querySelectorAll('[data-pipe-action]').forEach(btn => {
            btn.addEventListener('click', () => handleCardAction(btn));
        });
        board.querySelectorAll('[data-stage-select]').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id = sel.dataset.stageSelect;
                const stage = sel.value;
                const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token(), {
                    action: 'move',
                    id,
                    stage
                });
                if (!ok) {
                    showToast(data.message || data.error || 'Could not update stage.', 'error');
                    loadPipeline();
                    return;
                }
                showToast(`Moved to ${stageLabel(stage)}.`, 'success');
                loadPipeline();
            });
        });
        board.querySelectorAll('[data-next-save]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.nextSave;
                const input = board.querySelector(`[data-next-input="${id}"]`);
                const nextAction = input ? input.value.trim() : '';
                const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token(), {
                    action: 'update',
                    id,
                    nextAction
                });
                if (!ok) {
                    showToast(data.message || data.error || 'Could not save next action.', 'error');
                    return;
                }
                showToast('Next course of action saved.', 'success');
                loadPipeline();
            });
        });
    }

    function renderCard(item) {
        const meet = item.meetLink || meetLink || DEFAULT_MEET;
        return `
            <article class="pipeline-card" data-id="${escapeHtml(item.id)}">
                <h4>${escapeHtml(item.fullName)}</h4>
                <p class="pipeline-meta">${escapeHtml(item.email)}${item.phone ? ' · ' + escapeHtml(item.phone) : ''}</p>
                ${item.roleInterest ? `<p class="pipeline-role">${escapeHtml(item.roleInterest)}</p>` : ''}
                <div class="pipeline-next">
                    <label>Next course of action</label>
                    <input type="text" data-next-input="${escapeHtml(item.id)}" value="${escapeHtml(item.nextAction || '')}" placeholder="Define next step…">
                    <button type="button" class="btn-admin" data-next-save="${escapeHtml(item.id)}">Save</button>
                </div>
                <div class="pipeline-stage-row">
                    <label>Stage</label>
                    <select data-stage-select="${escapeHtml(item.id)}">${stageOptions(item.stage)}</select>
                </div>
                <div class="pipeline-card-actions">
                    <button type="button" class="btn-admin btn-admin--reattempt" data-pipe-action="schedule" data-id="${escapeHtml(item.id)}">Schedule interview</button>
                    <a class="btn-admin" href="${escapeHtml(meet)}" target="_blank" rel="noopener">Open Meet</a>
                </div>
                ${item.interviewAt ? `<p class="pipeline-interview">Interview: ${escapeHtml(formatDate(item.interviewAt))}</p>` : ''}
                ${item.notes ? `<p class="pipeline-notes">${escapeHtml(item.notes)}</p>` : ''}
            </article>
        `;
    }

    function formatDate(iso) {
        try {
            return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return iso;
        }
    }

    async function handleCardAction(btn) {
        const id = btn.dataset.id;
        const action = btn.dataset.pipeAction;
        if (action === 'schedule') {
            const when = window.prompt('Interview date/time (optional note or ISO). Leave blank for now:', new Date().toISOString().slice(0, 16));
            if (when === null) return;
            const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token(), {
                action: 'schedule',
                id,
                interviewAt: when || new Date().toISOString(),
                meetLink: meetLink || DEFAULT_MEET,
                nextAction: 'Conduct interview via Google Meet and record outcome.'
            });
            if (!ok) {
                showToast(data.message || data.error || 'Could not schedule.', 'error');
                return;
            }
            showToast('Interview scheduled. Join Google Meet when ready.', 'success');
            loadPipeline();
        }
    }

    async function loadPipeline() {
        const board = document.getElementById('pipeline-board');
        const { ok, data } = await window.TrinitasAPI.pipelineList(token());
        if (!ok) {
            if (data?.error === 'Unauthorized' || data?.error === 'Unauthorized') {
                clearAuth();
                showAuth();
                return;
            }
            if (board) board.innerHTML = '<p class="section-desc">Could not load pipeline.</p>';
            return;
        }
        stages = data.stages || [];
        meetLink = data.meetLink || DEFAULT_MEET;
        const join = document.getElementById('hr-join-meet');
        if (join) join.href = meetLink;
        const items = data.items || [];
        renderStats(items);
        renderBoard(items);
    }

    function initAddForm() {
        const form = document.getElementById('pipeline-add-form');
        const alert = document.getElementById('pipeline-add-alert');
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            const payload = {
                action: 'create',
                fullName: form.fullName.value.trim(),
                email: form.email.value.trim().toLowerCase(),
                phone: form.phone.value.trim(),
                roleInterest: form.roleInterest.value.trim(),
                stage: form.stage.value,
                nextAction: form.nextAction.value.trim(),
                notes: form.notes.value.trim(),
                source: 'hr-manual'
            };
            const btn = form.querySelector('button[type="submit"]');
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Adding…';
            try {
                const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token(), payload);
                if (!ok || !data.success) {
                    showAlert(alert, data.message || data.error || 'Could not add candidate.', 'error');
                    btn.disabled = false;
                    btn.textContent = label;
                    return;
                }
                form.reset();
                showAlert(alert, data.message || 'Added to pipeline.', 'success');
                loadPipeline();
            } catch {
                showAlert(alert, 'Unable to add candidate right now.', 'error');
            }
            btn.disabled = false;
            btn.textContent = label;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        initRegister();
        initLogin();
        initAddForm();
        document.getElementById('hr-logout')?.addEventListener('click', () => {
            clearAuth();
            showAuth();
        });
        document.getElementById('hr-refresh')?.addEventListener('click', loadPipeline);

        if (getAuth()?.token) showDashboard();
        else showAuth();
    });
})();
