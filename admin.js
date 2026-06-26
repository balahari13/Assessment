(function () {
    'use strict';

    const TOKEN_KEY = 'trinitas_admin_token';

    function scoreClass(val) {
        if (val >= 75) return 'score-pill--high';
        if (val >= 50) return 'score-pill--mid';
        return 'score-pill--low';
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function renderTable(results) {
        const tbody = document.getElementById('results-body');
        if (!results.length) {
            tbody.innerHTML = '<tr><td colspan="9">No assessment submissions yet.</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(r => `
            <tr>
                <td>${r.fullName || '—'}</td>
                <td>${r.email || '—'}</td>
                <td>${r.phone || '—'}</td>
                <td><span class="score-pill ${scoreClass(r.grammar?.percent || 0)}">${r.grammar?.percent || 0}%</span></td>
                <td><span class="score-pill ${scoreClass(Math.min(100, (r.typing?.bestWpm || 0)))}">${r.typing?.bestWpm || 0} WPM</span></td>
                <td>${r.typing?.bestAccuracy || 0}%</td>
                <td><span class="score-pill ${scoreClass(r.voice?.completionPercent || 0)}">${r.voice?.completionPercent || 0}%</span></td>
                <td><strong>${r.overallScore || 0}%</strong></td>
                <td>${formatDate(r.completedAt)}</td>
            </tr>
        `).join('');
    }

    function renderSummary(summary) {
        document.getElementById('stat-total').textContent = summary.total;
        document.getElementById('stat-grammar').textContent = `${summary.avgGrammar}%`;
        document.getElementById('stat-typing').textContent = `${summary.avgTypingWpm} WPM`;
        document.getElementById('stat-voice').textContent = `${summary.avgVoice}%`;
    }

    function exportCsv(results) {
        const headers = ['Name', 'Email', 'Phone', 'Grammar %', 'Best WPM', 'Accuracy %', 'Voice %', 'Overall %', 'Completed At'];
        const rows = results.map(r => [
            r.fullName, r.email, r.phone,
            r.grammar?.percent || 0,
            r.typing?.bestWpm || 0,
            r.typing?.bestAccuracy || 0,
            r.voice?.completionPercent || 0,
            r.overallScore || 0,
            r.completedAt || ''
        ]);
        const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `trinitas-assessments-${Date.now()}.csv`;
        a.click();
    }

    async function loadResults() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminResults(token);
        if (!ok) {
            sessionStorage.removeItem(TOKEN_KEY);
            showLogin();
            return;
        }
        renderSummary(data.summary);
        renderTable(data.results);
        document.getElementById('export-csv').onclick = () => exportCsv(data.results);
    }

    function showLogin() {
        document.getElementById('admin-login').hidden = false;
        document.getElementById('admin-dashboard').hidden = true;
    }

    function showDashboard() {
        document.getElementById('admin-login').hidden = true;
        document.getElementById('admin-dashboard').hidden = false;
        loadResults();
    }

    function initLogin() {
        const form = document.getElementById('admin-login-form');
        const error = document.getElementById('admin-error');

        form.addEventListener('submit', async e => {
            e.preventDefault();
            error.hidden = true;
            const username = form.username.value.trim();
            const password = form.password.value;

            const { ok, data } = await window.TrinitasAPI.adminLogin(username, password);
            if (!ok) {
                error.textContent = 'Invalid admin ID or password.';
                error.hidden = false;
                return;
            }
            sessionStorage.setItem(TOKEN_KEY, data.token);
            showDashboard();
        });

        document.getElementById('admin-logout').addEventListener('click', () => {
            sessionStorage.removeItem(TOKEN_KEY);
            showLogin();
        });

        document.getElementById('admin-refresh').addEventListener('click', loadResults);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initLogin();
        if (sessionStorage.getItem(TOKEN_KEY)) {
            showDashboard();
        } else {
            showLogin();
        }
    });
})();