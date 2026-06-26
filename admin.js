(function () {
    'use strict';

    const TOKEN_KEY = 'trinitas_admin_token';
    let cachedResults = [];

    function scoreClass(val) {
        if (val >= 75) return 'score-pill--high';
        if (val >= 50) return 'score-pill--mid';
        return 'score-pill--low';
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function showToast(message, type) {
        let toast = document.getElementById('admin-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'admin-toast';
            document.getElementById('admin-dashboard').insertBefore(
                toast,
                document.querySelector('.admin-stats')
            );
        }
        toast.className = `admin-toast admin-toast--${type}`;
        toast.textContent = message;
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 4000);
    }

    async function handleDelete(email) {
        if (!confirm(`Delete the assessment response for ${email}? This cannot be undone.`)) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminDelete(token, email);
        if (!ok) {
            showToast(data.error || 'Delete failed.', 'error');
            return;
        }
        showToast(data.message || 'Response deleted.', 'success');
        loadResults();
    }

    async function handleReattempt(email) {
        if (!confirm(`Allow ${email} to retake the assessment? Their previous submission will be removed.`)) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminReattempt(token, email);
        if (!ok) {
            showToast(data.error || 'Reattempt grant failed.', 'error');
            return;
        }
        showToast(data.message || 'Reattempt allowed.', 'success');
        loadResults();
    }

    function getEnglishPercent(result) {
        if (typeof result.englishPercent === 'number') return result.englishPercent;
        const mcq = result.grammar?.percent || 0;
        const fill = result.fillBlank?.percent || 0;
        if (result.fillBlank) return Math.round((mcq + fill) / 2);
        return mcq;
    }

    function renderAnswerKey() {
        const data = window.ASSESSMENT_DATA;
        const container = document.getElementById('answer-key-content');
        if (!data || !container) return;

        const mcqHtml = data.grammarQuestions.map((item, i) => {
            const correct = item.options[item.answer] || '—';
            return `<li><strong>Q${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${correct}</span></li>`;
        }).join('');

        const fillHtml = data.fillBlankQuestions.map((item, i) => {
            const answers = (item.answers || []).join(' / ');
            return `<li><strong>F${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${answers}</span></li>`;
        }).join('');

        const readingHtml = (data.readingPassages || []).map((passage, pIdx) => {
            const qHtml = passage.questions.map((item, i) => {
                const correct = item.options[item.answer] || '—';
                return `<li><strong>Q${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${correct}</span></li>`;
            }).join('');
            return `
                <div class="answer-key-passage-block">
                    <h4>Passage ${pIdx + 1}: ${passage.title}</h4>
                    <p class="answer-key-passage-snippet">${passage.passage}</p>
                    <ol class="answer-key-list">${qHtml}</ol>
                </div>
            `;
        }).join('');

        const workplaceHtml = (data.workplaceQuestions || []).map((item, i) => {
            const correct = item.options[item.answer] || '—';
            return `<li><strong>W${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${correct}</span></li>`;
        }).join('');

        const voiceHtml = data.voicePrompts.map((item, i) =>
            `<li><strong>V${i + 1}.</strong> [${item.type}] ${item.text}</li>`
        ).join('');

        container.innerHTML = `
            <div class="answer-key-grid">
                <section class="answer-key-section">
                    <h3>Multiple Choice (${data.grammarQuestions.length})</h3>
                    <ol class="answer-key-list">${mcqHtml}</ol>
                </section>
                <section class="answer-key-section">
                    <h3>Fill in the Blanks (${data.fillBlankQuestions.length})</h3>
                    <ol class="answer-key-list">${fillHtml}</ol>
                </section>
                <section class="answer-key-section answer-key-section--full">
                    <h3>Reading Comprehension</h3>
                    ${readingHtml}
                </section>
                <section class="answer-key-section answer-key-section--full">
                    <h3>Workplace &amp; Psychology (${(data.workplaceQuestions || []).length})</h3>
                    <ol class="answer-key-list">${workplaceHtml}</ol>
                </section>
                <section class="answer-key-section answer-key-section--full">
                    <h3>Typing Passage</h3>
                    <pre class="answer-key-passage">${data.typingPassage}</pre>
                </section>
                <section class="answer-key-section answer-key-section--full">
                    <h3>Voice Prompts (${data.voicePrompts.length})</h3>
                    <ol class="answer-key-list">${voiceHtml}</ol>
                </section>
            </div>
        `;
    }

    function renderTable(results) {
        const tbody = document.getElementById('results-body');
        cachedResults = results;
        if (!results.length) {
            tbody.innerHTML = '<tr><td colspan="12">No assessment submissions yet.</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(r => {
            const email = r.email || '';
            return `
            <tr data-email="${email}">
                <td>${r.fullName || '—'}</td>
                <td>${email || '—'}</td>
                <td>${r.phone || '—'}</td>
                <td><span class="score-pill ${scoreClass(getEnglishPercent(r))}">${getEnglishPercent(r)}%</span></td>
                <td><span class="score-pill ${scoreClass(r.reading?.percent || 0)}">${r.reading?.percent || 0}%</span></td>
                <td><span class="score-pill ${scoreClass(r.workplace?.percent || 0)}">${r.workplace?.percent || 0}%</span></td>
                <td><span class="score-pill ${scoreClass(Math.min(100, (r.typing?.bestWpm || 0)))}">${r.typing?.bestWpm || 0} WPM</span></td>
                <td>${r.typing?.bestAccuracy || 0}%</td>
                <td><span class="score-pill ${scoreClass(r.voice?.completionPercent || 0)}">${r.voice?.completionPercent || 0}%</span></td>
                <td><strong>${r.overallScore || 0}%</strong></td>
                <td>${formatDate(r.completedAt)}</td>
                <td>
                    <div class="admin-actions">
                        <button type="button" class="btn-admin btn-admin--delete" data-action="delete" data-email="${email}">Delete</button>
                        <button type="button" class="btn-admin btn-admin--reattempt" data-action="reattempt" data-email="${email}">Allow Reattempt</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.dataset.email;
                if (btn.dataset.action === 'delete') handleDelete(email);
                else handleReattempt(email);
            });
        });
    }

    function renderSummary(summary) {
        document.getElementById('stat-total').textContent = summary.total;
        document.getElementById('stat-grammar').textContent = `${summary.avgGrammar}%`;
        document.getElementById('stat-reading').textContent = `${summary.avgReading || 0}%`;
        document.getElementById('stat-workplace').textContent = `${summary.avgWorkplace || 0}%`;
        document.getElementById('stat-typing').textContent = `${summary.avgTypingWpm} WPM`;
        document.getElementById('stat-voice').textContent = `${summary.avgVoice}%`;
    }

    function exportCsv(results) {
        const headers = ['Name', 'Email', 'Phone', 'English %', 'MCQ %', 'Fill Blank %', 'Reading %', 'Workplace %', 'Best WPM', 'Accuracy %', 'Voice %', 'Overall %', 'Completed At'];
        const rows = results.map(r => [
            r.fullName, r.email, r.phone,
            getEnglishPercent(r),
            r.grammar?.percent || 0,
            r.fillBlank?.percent || 0,
            r.reading?.percent || 0,
            r.workplace?.percent || 0,
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
        renderAnswerKey();
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

        document.getElementById('toggle-answer-key').addEventListener('click', () => {
            const panel = document.getElementById('answer-key-panel');
            const visible = !panel.hidden;
            panel.hidden = visible;
            document.getElementById('toggle-answer-key').textContent = visible ? 'Answer Key' : 'Hide Answer Key';
            if (!visible) renderAnswerKey();
        });
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