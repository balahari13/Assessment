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
        const toast = document.getElementById('admin-toast');
        if (!toast) return;
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
        if (!confirm(`Reset all attempts for ${email}? Both Attempt 1 and 2 records will be removed.`)) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminReattempt(token, email);
        if (!ok) {
            showToast(data.error || 'Reset failed.', 'error');
            return;
        }
        showToast(data.message || 'Candidate reset.', 'success');
        loadResults();
    }

    async function handleEnableAttempt2(email) {
        if (!confirm(`Enable Attempt 2 for ${email}?`)) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminEnableAttempt2(token, email);
        if (!ok) {
            showToast(data.message || data.error || 'Could not enable Attempt 2.', 'error');
            return;
        }
        showToast(data.message || 'Attempt 2 enabled.', 'success');
        loadResults();
    }

    function normalizeCandidate(record) {
        if (!record) return null;
        if (record.attempt1 !== undefined || record.attempt2 !== undefined) return record;
        if (record.overallScore !== undefined || record.grammar) {
            return {
                email: record.email,
                fullName: record.fullName,
                phone: record.phone,
                attempt1: record,
                attempt2: null,
                attempt2Enabled: false
            };
        }
        return record;
    }

    function getSubmission(candidate, attemptNumber) {
        const c = normalizeCandidate(candidate);
        if (!c) return null;
        return attemptNumber === 1 ? c.attempt1 : c.attempt2;
    }

    function getEnglishPercent(result) {
        if (!result) return 0;
        if (typeof result.englishPercent === 'number') return result.englishPercent;
        const mcq = result.grammar?.percent || 0;
        const fill = result.fillBlank?.percent || 0;
        if (result.fillBlank) return Math.round((mcq + fill) / 2);
        return mcq;
    }

    function scorePill(val, suffix) {
        if (val === null || val === undefined || val === '') return '—';
        const n = Number(val);
        if (Number.isNaN(n)) return '—';
        const sfx = suffix || '%';
        return `<span class="score-pill ${scoreClass(n)}">${n}${sfx}</span>`;
    }

    function getAssessmentData(attemptNumber) {
        return attemptNumber === 2 ? window.ASSESSMENT_DATA_ATTEMPT2 : window.ASSESSMENT_DATA;
    }

    function normalizeFill(s) {
        return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function mcqRow(item, userIdx, label) {
        const correct = item.options[item.answer] || '—';
        const user = userIdx !== null && userIdx !== undefined ? (item.options[userIdx] || '—') : '—';
        const ok = userIdx === item.answer;
        const miss = userIdx === null || userIdx === undefined;
        const cls = miss ? 'admin-ans-row--na' : ok ? 'admin-ans-row--ok' : 'admin-ans-row--bad';
        return `<li class="admin-ans-row ${cls}"><span class="admin-ans-q">${label}</span><span class="admin-ans-user">Answer: ${user}</span> <span class="${ok ? 'admin-ans-correct' : 'admin-ans-miss'}">Correct: ${correct}</span></li>`;
    }

    function renderAttemptDetail(submission, attemptNumber) {
        if (!submission) return '<p class="section-desc">No submission for this attempt.</p>';
        const data = getAssessmentData(attemptNumber);
        if (!data) return '<p class="section-desc">Answer key not loaded.</p>';

        const mcqHtml = data.grammarQuestions.map((item, i) =>
            mcqRow(item, submission.grammar?.answers?.[i], `Q${i + 1}. ${item.q}`)
        ).join('');

        const fillHtml = data.fillBlankQuestions.map((item, i) => {
            const user = submission.fillBlank?.answers?.[i] || '—';
            const accepted = (item.answers || []).map(normalizeFill);
            const ok = accepted.includes(normalizeFill(user));
            const cls = !user || user === '—' ? 'admin-ans-row--na' : ok ? 'admin-ans-row--ok' : 'admin-ans-row--bad';
            const correct = (item.answers || []).join(' / ');
            return `<li class="admin-ans-row ${cls}"><span class="admin-ans-q">F${i + 1}. ${item.q}</span><span class="admin-ans-user">Answer: ${user}</span> <span class="${ok ? 'admin-ans-correct' : 'admin-ans-miss'}">Accepted: ${correct}</span></li>`;
        }).join('');

        let flat = 0;
        const readingHtml = (data.readingPassages || []).map((passage, pIdx) => {
            const rows = passage.questions.map((item, qIdx) => {
                const row = mcqRow(item, submission.reading?.answers?.[flat], `P${pIdx + 1} Q${qIdx + 1}. ${item.q}`);
                flat += 1;
                return row;
            }).join('');
            return `<h4 style="font-size:0.85rem;margin:0.5rem 0">${passage.title}</h4><ul class="admin-ans-list">${rows}</ul>`;
        }).join('');

        const workplaceHtml = (data.workplaceQuestions || []).map((item, i) =>
            mcqRow(item, submission.workplace?.answers?.[i], `W${i + 1}. ${item.q}`)
        ).join('');

        const typed = submission.typing?.rounds?.[0]?.typedText || '—';
        const voiceHtml = (submission.voice?.prompts || data.voicePrompts.map((p, i) => ({ text: p.text, type: p.type, completed: false }))).map((p, i) => {
            const done = p.completed ? 'Completed' : 'Not completed';
            const cls = p.completed ? 'admin-ans-row--ok' : 'admin-ans-row--na';
            return `<li class="admin-ans-row ${cls}"><span class="admin-ans-q">V${i + 1}. [${p.type || 'prompt'}]</span>${p.text || ''} <span class="admin-ans-user"> — ${done}${p.durationSec ? ` (${p.durationSec}s)` : ''}</span></li>`;
        }).join('');

        const s = submission;
        return `
            <div class="admin-section-scores">
                <div class="admin-section-score"><strong>${s.overallScore || 0}%</strong><span>Overall</span></div>
                <div class="admin-section-score"><strong>${s.oddman?.percent || 0}%</strong><span>Odd Man</span></div>
                <div class="admin-section-score"><strong>${s.scenarios?.percent || 0}%</strong><span>Scenarios</span></div>
                <div class="admin-section-score"><strong>${getEnglishPercent(s)}%</strong><span>English</span></div>
                <div class="admin-section-score"><strong>${s.grammar?.percent || 0}%</strong><span>MCQ</span></div>
                <div class="admin-section-score"><strong>${s.fillBlank?.percent || 0}%</strong><span>Fill</span></div>
                <div class="admin-section-score"><strong>${s.reading?.percent || 0}%</strong><span>Reading</span></div>
                <div class="admin-section-score"><strong>${s.workplace?.percent || 0}%</strong><span>Workplace</span></div>
                <div class="admin-section-score"><strong>${(s.emailWriting || s.email)?.percent || 0}%</strong><span>Email</span></div>
                <div class="admin-section-score"><strong>${s.typing?.bestWpm || 0}</strong><span>WPM</span></div>
                <div class="admin-section-score"><strong>${s.typing?.bestAccuracy || 0}%</strong><span>Accuracy</span></div>
                <div class="admin-section-score"><strong>${s.voice?.completionPercent || 0}%</strong><span>Voice</span></div>
            </div>
            <div class="admin-detail-block"><h3>Odd Man Out (${s.oddman?.score || 0}/${(data.oddManOutQuestions || []).length || 25}) — ${s.oddman?.percent || 0}%</h3></div>
            <div class="admin-detail-block"><h3>Customer Response Ranking (${s.scenarios?.score || 0} pts) — ${s.scenarios?.percent || 0}%</h3>
                <ul class="admin-ans-list">${(s.scenarios?.rankings || []).map((r, i) =>
                    `<li class="admin-ans-row admin-ans-row--na"><span class="admin-ans-q">Scenario ${i + 1}</span> Best: ${r?.best ?? '—'} · Neutral: ${r?.neutral ?? '—'} · Worst: ${r?.worst ?? '—'}</li>`
                ).join('') || '<li class="admin-ans-row admin-ans-row--na">No rankings saved</li>'}</ul>
            </div>
            <div class="admin-detail-block"><h3>Multiple Choice (${s.grammar?.score || 0}/${data.grammarQuestions.length})</h3><ul class="admin-ans-list">${mcqHtml}</ul></div>
            <div class="admin-detail-block"><h3>Fill in the Blanks (${s.fillBlank?.score || 0}/${data.fillBlankQuestions.length})</h3><ul class="admin-ans-list">${fillHtml}</ul></div>
            <div class="admin-detail-block"><h3>Reading (${s.reading?.score || 0}/${data.readingPassages?.reduce((n, p) => n + p.questions.length, 0) || 0})</h3>${readingHtml}</div>
            <div class="admin-detail-block"><h3>Workplace (${s.workplace?.score || 0}/${data.workplaceQuestions?.length || 0})</h3><ul class="admin-ans-list">${workplaceHtml}</ul></div>
            <div class="admin-detail-block"><h3>Email Writing (${(s.emailWriting || (typeof s.email === 'object' ? s.email : null) || {})?.percent || 0}%)</h3>${renderEmailDetail(s.emailWriting || (typeof s.email === 'object' ? s.email : null))}</div>
            <div class="admin-detail-block"><h3>Typing — ${s.typing?.bestWpm || 0} WPM, ${s.typing?.bestAccuracy || 0}% accuracy</h3><pre class="admin-typed-preview">${typed}</pre></div>
            <div class="admin-detail-block"><h3>Voice (${s.voice?.completionPercent || 0}%${s.voice?.validCount != null ? `, ${s.voice.validCount} valid` : ''})</h3><ul class="admin-ans-list">${voiceHtml}</ul></div>
        `;
    }

    function renderEmailDetail(email) {
        if (!email || !email.topics || !email.topics.length) {
            return '<p class="section-desc">No email responses recorded.</p>';
        }
        return email.topics.map((t, i) => {
            const score = email.scores?.[i] ?? '—';
            const words = email.wordCounts?.[i] ?? countWordsAdmin(email.responses?.[i]);
            const body = email.responses?.[i] || '—';
            return `
                <div style="margin-bottom:0.85rem">
                    <h4 style="font-size:0.85rem;margin:0 0 0.35rem">Email ${i + 1}: ${t.title || 'Topic'} — Score ${score}% · ${words} words</h4>
                    <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 0.35rem">${t.scenario || ''}</p>
                    <pre class="admin-typed-preview">${escapeHtml(body)}</pre>
                </div>
            `;
        }).join('');
    }

    function countWordsAdmin(text) {
        return String(text || '').trim().split(/\s+/).filter(Boolean).length;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    let detailEmail = null;
    let detailAttempt = 1;

    function openDetailModal(email) {
        const raw = cachedResults.find(r => (normalizeCandidate(r)?.email || r.email) === email);
        const candidate = normalizeCandidate(raw);
        if (!candidate) return;
        detailEmail = email;
        detailAttempt = candidate.attempt1 ? 1 : 2;
        renderDetailModal(candidate);
        const modal = document.getElementById('detail-modal');
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('admin-modal-open');
    }

    function closeDetailModal() {
        const modal = document.getElementById('detail-modal');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('admin-modal-open');
    }

    function renderDetailModal(candidate) {
        const container = document.getElementById('detail-modal-content');
        const a1 = getSubmission(candidate, 1);
        const a2 = getSubmission(candidate, 2);
        const active = detailAttempt === 2 && a2 ? 2 : 1;
        const sub = active === 2 ? a2 : a1;

        container.innerHTML = `
            <div class="admin-detail-header">
                <h2>${candidate.fullName || sub?.fullName || 'Candidate'}</h2>
                <div class="admin-detail-meta">
                    <span>${candidate.email}</span>
                    <span>${candidate.phone || sub?.phone || ''}</span>
                    <span>Completed: ${formatDate(sub?.completedAt)}</span>
                    <span>Duration: ${sub?.durationMinutes || '—'} min</span>
                </div>
            </div>
            <div class="admin-attempt-tabs">
                <button type="button" class="admin-attempt-tab ${active === 1 ? 'admin-attempt-tab--active' : ''}" data-attempt="1" ${!a1 ? 'disabled' : ''}>Attempt 1</button>
                <button type="button" class="admin-attempt-tab ${active === 2 ? 'admin-attempt-tab--active' : ''}" data-attempt="2" ${!a2 ? 'disabled' : ''}>Attempt 2</button>
            </div>
            ${renderAttemptDetail(sub, active)}
        `;

        container.querySelectorAll('[data-attempt]').forEach(btn => {
            btn.addEventListener('click', () => {
                detailAttempt = parseInt(btn.dataset.attempt, 10);
                renderDetailModal(candidate);
            });
        });
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

        const attempt2 = window.ASSESSMENT_DATA_ATTEMPT2;
        const attempt2Section = attempt2 ? renderAnswerKeyForData(attempt2, 'Attempt 2') : '';

        container.innerHTML = `
            <div class="answer-key-grid">
                <section class="answer-key-section answer-key-section--full">
                    <h3>Attempt 1</h3>
                </section>
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
                ${attempt2Section}
            </div>
        `;
    }

    function renderAnswerKeyForData(data, title) {
        const mcqHtml = data.grammarQuestions.map((item, i) => {
            const correct = item.options[item.answer] || '—';
            return `<li><strong>Q${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${correct}</span></li>`;
        }).join('');
        const fillHtml = data.fillBlankQuestions.map((item, i) => {
            const answers = (item.answers || []).join(' / ');
            return `<li><strong>F${i + 1}.</strong> ${item.q} <span class="answer-key-ans">→ ${answers}</span></li>`;
        }).join('');
        return `
            <section class="answer-key-section answer-key-section--full">
                <h3>${title}</h3>
                <h4>Multiple Choice</h4>
                <ol class="answer-key-list">${mcqHtml}</ol>
                <h4>Fill in the Blanks</h4>
                <ol class="answer-key-list">${fillHtml}</ol>
            </section>
        `;
    }

    function renderTable(results) {
        const tbody = document.getElementById('results-body');
        cachedResults = results;
        if (!results.length) {
            tbody.innerHTML = '<tr><td colspan="16">No assessment submissions yet.</td></tr>';
            return;
        }

        tbody.innerHTML = results.map(raw => {
            const r = normalizeCandidate(raw);
            const email = r.email || '';
            const a1 = getSubmission(r, 1);
            const a2 = getSubmission(r, 2);
            return `
            <tr data-email="${email}">
                <td>${r.fullName || a1?.fullName || '—'}</td>
                <td>${email || '—'}</td>
                <td>${scorePill(a1?.overallScore)}</td>
                <td>${scorePill(getEnglishPercent(a1))}</td>
                <td>${scorePill(a1?.grammar?.percent)}</td>
                <td>${scorePill(a1?.fillBlank?.percent)}</td>
                <td>${scorePill(a1?.reading?.percent)}</td>
                <td>${scorePill(a1?.workplace?.percent)}</td>
                <td>${scorePill((a1?.emailWriting || (typeof a1?.email === 'object' ? a1.email : null))?.percent)}</td>
                <td>${a1?.typing?.bestWpm ? `${a1.typing.bestWpm}` : '—'}</td>
                <td>${scorePill(a1?.typing?.bestAccuracy)}</td>
                <td>${scorePill(a1?.voice?.completionPercent)}</td>
                <td>${scorePill(a2?.overallScore)}</td>
                <td>${r.attempt2Enabled ? '<span class="score-pill score-pill--high">Yes</span>' : 'No'}</td>
                <td><button type="button" class="btn-admin" data-action="view" data-email="${email}" ${!a1 && !a2 ? 'disabled' : ''}>View</button></td>
                <td>
                    <div class="admin-actions">
                        <button type="button" class="btn-admin btn-admin--attempt2" data-action="enable2" data-email="${email}" ${!a1 || r.attempt2Enabled ? 'disabled' : ''}>Enable Att.2</button>
                        <button type="button" class="btn-admin btn-admin--delete" data-action="delete" data-email="${email}">Delete</button>
                        <button type="button" class="btn-admin btn-admin--reattempt" data-action="reattempt" data-email="${email}">Reset</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.dataset.email;
                if (btn.dataset.action === 'view') openDetailModal(email);
                else if (btn.dataset.action === 'delete') handleDelete(email);
                else if (btn.dataset.action === 'enable2') handleEnableAttempt2(email);
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
        const headers = [
            'Name', 'Email', 'Phone', 'Overall %', 'English %', 'MCQ %', 'Fill %', 'Reading %',
            'Workplace %', 'Email Writing %', 'Typing WPM', 'Typing Acc %', 'Voice %', 'Attempt2 Overall %',
            'Attempt2 Enabled', 'Attempt1 Completed', 'Attempt2 Completed'
        ];
        const rows = results.map(raw => {
            const r = normalizeCandidate(raw);
            const a1 = getSubmission(r, 1);
            const a2 = getSubmission(r, 2);
            return [
                r.fullName || a1?.fullName,
                r.email,
                r.phone || a1?.phone,
                a1?.overallScore || '',
                getEnglishPercent(a1) || '',
                a1?.grammar?.percent || '',
                a1?.fillBlank?.percent || '',
                a1?.reading?.percent || '',
                a1?.workplace?.percent || '',
                (a1?.emailWriting || (typeof a1?.email === 'object' ? a1.email : null))?.percent || '',
                a1?.typing?.bestWpm || '',
                a1?.typing?.bestAccuracy || '',
                a1?.voice?.completionPercent || '',
                a2?.overallScore || '',
                r.attempt2Enabled ? 'Yes' : 'No',
                a1?.completedAt || '',
                a2?.completedAt || ''
            ];
        });
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

    function initDetailModal() {
        const closeBtn = document.getElementById('detail-modal-close');
        const backdrop = document.getElementById('detail-modal-backdrop');
        if (closeBtn) closeBtn.addEventListener('click', closeDetailModal);
        if (backdrop) backdrop.addEventListener('click', closeDetailModal);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !document.getElementById('detail-modal').hidden) closeDetailModal();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initLogin();
        initDetailModal();
        if (sessionStorage.getItem(TOKEN_KEY)) {
            showDashboard();
        } else {
            showLogin();
        }
    });
})();