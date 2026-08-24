(function () {
    'use strict';

    function getStaffAuth() {
        const admin = sessionStorage.getItem('trinitas_admin_token');
        if (admin) return { role: 'admin', token: admin };
        try {
            const hr = JSON.parse(sessionStorage.getItem('trinitas_hr_auth') || 'null');
            if (hr?.token) return { role: 'hr', token: hr.token };
        } catch {
            /* ignore */
        }
        return null;
    }

    function showToast(message, type) {
        const toast = document.getElementById('staff-toast');
        if (!toast) return;
        toast.className = `admin-toast admin-toast--${type || 'success'}`;
        toast.textContent = message;
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 5000);
    }

    function showAlert(el, message, type) {
        if (!el) return;
        el.textContent = message;
        el.className = `form-alert form-alert--${type || 'error'}`;
        el.hidden = false;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return iso;
        }
    }

    async function loadList() {
        const tbody = document.getElementById('staff-list-body');
        const auth = getStaffAuth();
        if (!auth || !tbody) return;
        const { ok, data } = await window.TrinitasAPI.staffEmployeesList(auth.token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="5">Could not load employee list. Sign in again as Admin or HR.</td></tr>';
            return;
        }
        const list = data.employees || [];
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="5">No employee accounts yet.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(e => `
            <tr>
                <td>${e.fullName || '—'}</td>
                <td><code>${e.email}</code></td>
                <td>${e.phone || '—'}</td>
                <td>${formatDate(e.createdAt)}</td>
                <td>${e.createdBy || '—'}</td>
            </tr>
        `).join('');
    }

    function initCreate() {
        const form = document.getElementById('staff-create-form');
        const alert = document.getElementById('staff-create-alert');
        const result = document.getElementById('staff-create-result');
        if (!form) return;

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (alert) alert.hidden = true;
            if (result) result.hidden = true;
            const auth = getStaffAuth();
            if (!auth) return;
            const payload = {
                fullName: form.fullName.value.trim(),
                phone: form.phone.value.trim(),
                emailLocal: form.emailLocal.value.trim(),
                password: form.password.value.trim()
            };
            const btn = form.querySelector('button[type="submit"]');
            const label = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Creating…';
            const { ok, data } = await window.TrinitasAPI.staffEmployeeCreate(auth.token, payload);
            btn.disabled = false;
            btn.textContent = label;
            if (!ok) {
                showAlert(alert, data.message || data.error || 'Could not create account.', 'error');
                return;
            }
            form.reset();
            if (result) {
                result.hidden = false;
                result.innerHTML = `<strong>Account created.</strong><br>Email: <code>${data.email}</code><br>Password: <code>${data.password}</code><br><span style="font-size:0.85rem">Copy these now and share them securely with the employee. The password is not shown again.</span>`;
            }
            try {
                await navigator.clipboard.writeText(`${data.email}\n${data.password}`);
                showToast('Email and password copied to clipboard.', 'success');
            } catch {
                showToast(data.message || 'Account created.', 'success');
            }
            loadList();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const auth = getStaffAuth();
        const gate = document.getElementById('staff-gate');
        const dash = document.getElementById('staff-dash');
        if (!auth) {
            if (gate) gate.hidden = false;
            if (dash) dash.hidden = true;
            return;
        }
        if (gate) gate.hidden = true;
        if (dash) dash.hidden = false;
        const label = document.getElementById('staff-role-label');
        if (label) label.textContent = `Signed in as ${auth.role === 'admin' ? 'Admin' : 'HR'} · @agent.trinitas.in`;
        initCreate();
        loadList();
        document.getElementById('staff-refresh')?.addEventListener('click', loadList);
    });
})();
