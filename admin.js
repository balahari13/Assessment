(function () {
    'use strict';

    const TOKEN_KEY = 'trinitas_admin_token';
    let cachedResults = [];

    function scoreClass(val) {
        if (val >= 75) return 'score-pill--high';
        if (val >= 50) return 'score-pill--mid';
        return 'score-pill--low';
    }

    function formatReferral(item) {
        const src = item?.referredBy || '';
        const detail = item?.referredDetail || '';
        if (!src) return '—';
        return detail ? `${src} (${detail})` : src;
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
                <div class="admin-section-score"><strong>${s.oddman?.percent || 0}%</strong><span>Logic</span></div>
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
            <div class="admin-detail-block"><h3>Logical Reasoning (${s.oddman?.score || 0}/${(data.oddManOutQuestions || []).length || 25}) — ${s.oddman?.percent || 0}%</h3></div>
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

        const ref = candidate.referenceId || a1?.referenceId || a2?.referenceId || '—';
        container.innerHTML = `
            <div class="admin-detail-header">
                <h2>${candidate.fullName || sub?.fullName || 'Candidate'}</h2>
                <div class="admin-detail-meta">
                    <span><strong>Ref</strong> ${ref}</span>
                    <span>${candidate.email}</span>
                    <span>${candidate.phone || sub?.phone || ''}</span>
                    <span>Completed: ${formatDate(sub?.completedAt)}</span>
                    <span>Duration: ${sub?.durationMinutes || '—'} min</span>
                    ${sub?.serverScored ? '<span class="score-pill score-pill--high">Server scored</span>' : ''}
                    ${sub?.tabSwitchCount != null ? `<span>Tab switches: ${sub.tabSwitchCount}</span>` : ''}
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

    function getFilteredResults() {
        const q = (document.getElementById('results-search')?.value || '').trim().toLowerCase();
        const filter = document.getElementById('results-filter-attempt2')?.value || 'all';
        return cachedResults.filter(raw => {
            const r = normalizeCandidate(raw);
            const a1 = getSubmission(r, 1);
            const a2 = getSubmission(r, 2);
            const ref = (r.referenceId || a1?.referenceId || a2?.referenceId || '').toLowerCase();
            const hay = `${r.fullName || ''} ${r.email || ''} ${ref}`.toLowerCase();
            if (q && !hay.includes(q)) return false;
            if (filter === 'enabled' && !r.attempt2Enabled) return false;
            if (filter === 'done2' && !a2) return false;
            if (filter === 'a1only' && (!a1 || a2)) return false;
            return true;
        });
    }

    function renderTable(results) {
        const tbody = document.getElementById('results-body');
        if (results !== undefined) cachedResults = results;
        const list = getFilteredResults();
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="17">No matching assessment submissions.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(raw => {
            const r = normalizeCandidate(raw);
            const email = r.email || '';
            const a1 = getSubmission(r, 1);
            const a2 = getSubmission(r, 2);
            const ref = r.referenceId || a1?.referenceId || a2?.referenceId || '—';
            return `
            <tr data-email="${email}">
                <td><code class="admin-ref">${ref}</code></td>
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
                        <button type="button" class="btn-admin" data-action="pipeline" data-email="${email}" data-name="${escapeAttr(r.fullName || a1?.fullName)}" data-phone="${escapeAttr(r.phone || a1?.phone)}">To pipeline</button>
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
                else if (btn.dataset.action === 'pipeline') handleAssessmentToPipeline(btn);
                else handleReattempt(email);
            });
        });
    }

    async function handleAssessmentToPipeline(btn) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token, {
            action: 'create',
            fullName: btn.dataset.name || 'Candidate',
            email: btn.dataset.email,
            phone: btn.dataset.phone || '',
            stage: 'assessment',
            nextAction: 'Review assessment results and decide on interview.',
            source: 'assessment'
        });
        if (!ok) {
            showToast(data.message || data.error || 'Could not add to pipeline.', 'error');
            return;
        }
        showToast('Candidate added to hiring pipeline.', 'success');
        loadPipeline();
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
        loadPaused();
        loadResumes();
        loadCandidates();
        loadPipeline();
        loadHrTeam();
        loadAudit();
        loadInterviews();
    }

    async function loadInterviews() {
        const tbody = document.getElementById('interviews-body');
        if (!tbody) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.interviewBookingsAdmin(token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="4">Could not load interview bookings.</td></tr>';
            return;
        }
        const list = data.bookings || [];
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="4">No bookings yet.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(b => `
            <tr>
                <td>${b.date || '—'} · ${b.slot || '17:00–18:00 IST'}</td>
                <td>${b.fullName || '—'}</td>
                <td>${b.email || '—'}</td>
                <td>${b.meetLink ? `<a href="${b.meetLink}" target="_blank" rel="noopener">Meet</a>` : '—'}</td>
            </tr>
        `).join('');
    }

    async function loadAudit() {
        const tbody = document.getElementById('audit-body');
        if (!tbody) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminAudit(token, 100);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="6">Could not load audit log.</td></tr>';
            return;
        }
        const items = data.items || [];
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="6">No audit entries yet.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(e => `
            <tr>
                <td>${formatPausedDate(e.at)}</td>
                <td>${escapeHtml(e.actor || '—')}</td>
                <td>${escapeHtml(e.role || '—')}</td>
                <td><code>${escapeHtml(e.action || '—')}</code></td>
                <td>${escapeHtml(e.target || '—')}</td>
                <td style="font-size:0.78rem;max-width:220px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(JSON.stringify(e.meta || {}))}</td>
            </tr>
        `).join('');
    }

    function initAdminTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        if (!tabs.length) return;
        function showPanel(name) {
            tabs.forEach(t => t.classList.toggle('admin-tab--active', t.dataset.adminPanel === name));
            document.querySelectorAll('[data-admin-section]').forEach(sec => {
                const panels = String(sec.dataset.adminSection || '').split(/\s+/);
                const match = panels.includes(name) || (name === 'overview' && panels.includes('overview'));
                // overview shows stats only; other panels hide overview-only
                if (name === 'overview') {
                    sec.hidden = !panels.includes('overview');
                } else {
                    sec.hidden = !panels.includes(name);
                }
            });
            // overview also shows a quick slice of pipeline + results? keep overview = stats only
        }
        tabs.forEach(tab => {
            tab.addEventListener('click', () => showPanel(tab.dataset.adminPanel));
        });
        showPanel('overview');
    }

    async function handleResumeDownload(id) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminResumeDownload(token, id);
        if (!ok || !data.fileBase64) {
            showToast(data.error || 'Download failed.', 'error');
            return;
        }
        try {
            const b64 = String(data.fileBase64).replace(/^data:[^;]+;base64,/, '');
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blob = new Blob([bytes], { type: data.fileType || 'application/pdf' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = data.fileName || `resume-${id}.pdf`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('Download started.', 'success');
        } catch {
            showToast('Could not open file.', 'error');
        }
    }

    function renderResumes(resumes) {
        const tbody = document.getElementById('resumes-body');
        if (!tbody) return;
        if (!resumes || !resumes.length) {
            tbody.innerHTML = '<tr><td colspan="8">No resumes yet.</td></tr>';
            return;
        }
        tbody.innerHTML = resumes.map(r => `
            <tr>
                <td>${r.fullName || '—'}</td>
                <td>${r.email || '—'}</td>
                <td>${r.phone || '—'}</td>
                <td>${r.role || '—'}</td>
                <td>${formatReferral(r)}</td>
                <td>${r.fileName || '—'} ${r.sizeKb ? `(${r.sizeKb} KB)` : ''}</td>
                <td>${formatPausedDate(r.submittedAt)}</td>
                <td>
                    <div class="admin-actions">
                        <button type="button" class="btn-admin btn-admin--reattempt" data-resume-dl="${r.id}">Download</button>
                        <button type="button" class="btn-admin" data-resume-pipe="${r.id}" data-name="${escapeAttr(r.fullName)}" data-email="${escapeAttr(r.email)}" data-phone="${escapeAttr(r.phone)}" data-role="${escapeAttr(r.role)}">To pipeline</button>
                        <button type="button" class="btn-admin btn-admin--delete" data-resume-del="${r.id}">Delete</button>
                    </div>
                </td>
            </tr>
            ${r.notes ? `<tr><td colspan="8" style="font-size:0.8rem;color:var(--text-muted)">Note: ${String(r.notes).replace(/</g, '&lt;')}</td></tr>` : ''}
        `).join('');
        tbody.querySelectorAll('[data-resume-dl]').forEach(btn => {
            btn.addEventListener('click', () => handleResumeDownload(btn.dataset.resumeDl));
        });
        tbody.querySelectorAll('[data-resume-del]').forEach(btn => {
            btn.addEventListener('click', () => handleResumeDelete(btn.dataset.resumeDel));
        });
        tbody.querySelectorAll('[data-resume-pipe]').forEach(btn => {
            btn.addEventListener('click', () => handleResumeToPipeline(btn));
        });
    }

    function escapeAttr(s) {
        return String(s || '').replace(/"/g, '&quot;').replace(/</g, '');
    }

    async function handleResumeDelete(id) {
        if (!confirm('Delete this resume permanently? This cannot be undone.')) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminResumeDelete(token, id);
        if (!ok) {
            showToast(data.message || data.error || 'Delete failed.', 'error');
            return;
        }
        showToast(data.message || 'Resume deleted.', 'success');
        loadResumes();
    }

    async function handleResumeToPipeline(btn) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token, {
            action: 'create',
            fullName: btn.dataset.name || 'Candidate',
            email: btn.dataset.email,
            phone: btn.dataset.phone || '',
            roleInterest: btn.dataset.role || '',
            stage: 'applied',
            nextAction: 'Review resume and schedule HR screening.',
            source: 'resume'
        });
        if (!ok) {
            showToast(data.message || data.error || 'Could not add to pipeline.', 'error');
            return;
        }
        showToast('Added to hiring pipeline.', 'success');
        loadPipeline();
    }

    let pipelineStages = [];
    const DEFAULT_MEET = 'https://meet.google.com/ygi-ejrk-sae';

    function stageLabel(id) {
        const s = pipelineStages.find(x => x.id === id);
        return s ? s.label : id;
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function loadPipeline() {
        const board = document.getElementById('admin-pipeline-board');
        if (!board) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.pipelineList(token);
        if (!ok) {
            board.innerHTML = '<p class="section-desc">Could not load pipeline.</p>';
            return;
        }
        pipelineStages = data.stages || [];
        const items = data.items || [];
        if (!items.length) {
            board.innerHTML = '<p class="section-desc">No candidates in the pipeline yet.</p>';
            return;
        }
        const byStage = {};
        pipelineStages.forEach(s => { byStage[s.id] = []; });
        items.forEach(item => {
            const key = byStage[item.stage] ? item.stage : 'applied';
            if (!byStage[key]) byStage[key] = [];
            byStage[key].push(item);
        });
        board.innerHTML = `
            <div class="pipeline-columns">
                ${pipelineStages.map(stage => `
                    <div class="pipeline-column">
                        <header class="pipeline-column-head">
                            <h3>${escapeHtml(stage.label)}</h3>
                            <span class="pipeline-count">${(byStage[stage.id] || []).length}</span>
                        </header>
                        <div class="pipeline-cards">
                            ${(byStage[stage.id] || []).map(item => `
                                <article class="pipeline-card">
                                    <h4>${escapeHtml(item.fullName)}</h4>
                                    <p class="pipeline-meta">${escapeHtml(item.email)}</p>
                                    <p class="pipeline-next-text"><strong>Next:</strong> ${escapeHtml(item.nextAction || '—')}</p>
                                    <div class="pipeline-stage-row">
                                        <select data-admin-stage="${escapeHtml(item.id)}">
                                            ${pipelineStages.map(s => `<option value="${s.id}" ${s.id === item.stage ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="pipeline-card-actions">
                                        <button type="button" class="btn-admin" data-admin-next="${escapeHtml(item.id)}" data-current="${escapeAttr(item.nextAction)}">Set next action</button>
                                        <button type="button" class="btn-admin btn-admin--reattempt" data-admin-schedule="${escapeHtml(item.id)}">Schedule Meet</button>
                                        <a class="btn-admin" href="${escapeHtml(item.meetLink || DEFAULT_MEET)}" target="_blank" rel="noopener">Open Meet</a>
                                        <button type="button" class="btn-admin btn-admin--delete" data-admin-pipe-del="${escapeHtml(item.id)}">Remove</button>
                                    </div>
                                </article>
                            `).join('') || '<p class="pipeline-empty">Empty</p>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        board.querySelectorAll('[data-admin-stage]').forEach(sel => {
            sel.addEventListener('change', async () => {
                const { ok: moved, data: res } = await window.TrinitasAPI.pipelineUpdate(token, {
                    action: 'move',
                    id: sel.dataset.adminStage,
                    stage: sel.value
                });
                if (!moved) showToast(res.message || 'Move failed.', 'error');
                else showToast(`Moved to ${stageLabel(sel.value)}.`, 'success');
                loadPipeline();
            });
        });
        board.querySelectorAll('[data-admin-next]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const next = window.prompt('Next course of action:', btn.dataset.current || '');
                if (next === null) return;
                const { ok: saved, data: res } = await window.TrinitasAPI.pipelineUpdate(token, {
                    action: 'update',
                    id: btn.dataset.adminNext,
                    nextAction: next
                });
                if (!saved) showToast(res.message || 'Save failed.', 'error');
                else showToast('Next action updated.', 'success');
                loadPipeline();
            });
        });
        board.querySelectorAll('[data-admin-schedule]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const { ok: sched, data: res } = await window.TrinitasAPI.pipelineUpdate(token, {
                    action: 'schedule',
                    id: btn.dataset.adminSchedule,
                    interviewAt: new Date().toISOString(),
                    meetLink: DEFAULT_MEET,
                    nextAction: 'Conduct interview via Google Meet and record outcome.'
                });
                if (!sched) showToast(res.message || 'Schedule failed.', 'error');
                else showToast('Interview scheduled. Open Google Meet when ready.', 'success');
                loadPipeline();
            });
        });
        board.querySelectorAll('[data-admin-pipe-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Remove this pipeline entry permanently?')) return;
                const { ok: del, data: res } = await window.TrinitasAPI.pipelineUpdate(token, {
                    action: 'delete',
                    id: btn.dataset.adminPipeDel
                });
                if (!del) showToast(res.message || 'Delete failed.', 'error');
                else showToast('Pipeline entry removed.', 'success');
                loadPipeline();
            });
        });
    }

    function renderHrTeam(team) {
        const tbody = document.getElementById('hr-team-body');
        if (!tbody) return;
        if (!team.length) {
            tbody.innerHTML = '<tr><td colspan="6">No HR accounts yet. Staff can register at hr.html.</td></tr>';
            return;
        }
        tbody.innerHTML = team.map(h => `
            <tr>
                <td>${escapeHtml(h.fullName)}</td>
                <td>${escapeHtml(h.email)}</td>
                <td>${escapeHtml(h.phone || '—')}</td>
                <td>${h.active ? '<span class="score-pill score-pill--high">Active</span>' : '<span class="score-pill score-pill--low">Inactive</span>'}</td>
                <td>${formatPausedDate(h.createdAt)}</td>
                <td>
                    <div class="admin-actions">
                        ${h.active
                            ? `<button type="button" class="btn-admin" data-hr-action="deactivate" data-email="${escapeAttr(h.email)}">Deactivate</button>`
                            : `<button type="button" class="btn-admin" data-hr-action="activate" data-email="${escapeAttr(h.email)}">Activate</button>`}
                        <button type="button" class="btn-admin btn-admin--delete" data-hr-action="delete" data-email="${escapeAttr(h.email)}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('[data-hr-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.hrAction;
                const email = btn.dataset.email;
                if (action === 'delete' && !confirm(`Permanently delete HR account ${email}?`)) return;
                if (action === 'deactivate' && !confirm(`Deactivate HR account ${email}?`)) return;
                const token = sessionStorage.getItem(TOKEN_KEY);
                const { ok, data } = await window.TrinitasAPI.adminHrAction(token, { action, email });
                if (!ok) showToast(data.message || data.error || 'Action failed.', 'error');
                else showToast(data.message || 'Updated.', 'success');
                loadHrTeam();
            });
        });
    }

    async function loadHrTeam() {
        const tbody = document.getElementById('hr-team-body');
        if (!tbody) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminHrTeam(token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="6">Could not load HR team.</td></tr>';
            return;
        }
        renderHrTeam(data.team || []);
    }

    async function loadResumes() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const tbody = document.getElementById('resumes-body');
        if (!tbody) return;
        const { ok, data } = await window.TrinitasAPI.adminResumes(token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="7">Could not load resumes.</td></tr>';
            return;
        }
        renderResumes(data.resumes || []);
    }

    function formatPausedDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return iso;
        }
    }

    async function handleGenerateOtp(email) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!confirm(`Generate resume OTP for ${email}?`)) return;
        const { ok, data } = await window.TrinitasAPI.adminGenerateOtp(token, email);
        if (!ok) {
            showToast(data.message || data.error || 'Could not generate OTP.', 'error');
            return;
        }
        const otp = data.otp || '—';
        showToast(`OTP for ${email}: ${otp}${data.emailed ? ' (emailed)' : ' (share manually)'}`, 'success');
        // Keep toast longer for OTP readability
        const toast = document.getElementById('admin-toast');
        if (toast) {
            toast.innerHTML = `OTP for <strong>${email}</strong>: <span class="otp-code-display">${otp}</span>${data.emailed ? ' · emailed' : ' · share with candidate'}`;
        }
        loadPaused();
    }

    function renderPaused(sessions) {
        const tbody = document.getElementById('paused-body');
        if (!tbody) return;
        if (!sessions || !sessions.length) {
            tbody.innerHTML = '<tr><td colspan="6">No paused sessions.</td></tr>';
            return;
        }
        tbody.innerHTML = sessions.map(s => `
            <tr>
                <td>${s.fullName || '—'}</td>
                <td>${s.email || '—'}</td>
                <td>${s.phone || '—'}</td>
                <td>${formatPausedDate(s.pausedAt)}</td>
                <td>${s.status === 'otp_ready'
                    ? '<span class="score-pill score-pill--high">OTP ready</span>'
                    : '<span class="score-pill score-pill--mid">Awaiting OTP</span>'}</td>
                <td>
                    <button type="button" class="btn-admin btn-admin--attempt2" data-pause-otp="${s.email}">Generate OTP</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-pause-otp]').forEach(btn => {
            btn.addEventListener('click', () => handleGenerateOtp(btn.dataset.pauseOtp));
        });
    }

    async function loadPaused() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const tbody = document.getElementById('paused-body');
        if (!tbody) return;
        const { ok, data } = await window.TrinitasAPI.adminPaused(token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="6">Could not load paused sessions.</td></tr>';
            return;
        }
        renderPaused(data.sessions || []);
    }

    let assessmentDataReady = false;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[data-admin-src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.dataset.adminSrc = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.body.appendChild(s);
        });
    }

    async function ensureAssessmentData() {
        if (assessmentDataReady && window.ASSESSMENT_DATA) return true;
        try {
            await loadScript('assessment-aptitude.js');
            await loadScript('assessment-data.js');
            await loadScript('assessment-data-attempt2.js');
            if (window.__attachAssessmentAptitude) window.__attachAssessmentAptitude();
            assessmentDataReady = true;
            return true;
        } catch (err) {
            console.error(err);
            showToast('Could not load assessment data for answer key.', 'error');
            return false;
        }
    }

    function showLogin() {
        const login = document.getElementById('admin-login');
        const dash = document.getElementById('admin-dashboard');
        if (login) {
            login.hidden = false;
            login.setAttribute('aria-hidden', 'false');
        }
        if (dash) {
            dash.hidden = true;
            dash.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.add('admin-logged-out');
        document.body.classList.remove('admin-logged-in');
        // Never leave answer key open after logout
        const ak = document.getElementById('answer-key-panel');
        if (ak) ak.hidden = true;
        const toggle = document.getElementById('toggle-answer-key');
        if (toggle) toggle.textContent = 'Answer Key';
    }

    async function showDashboard() {
        const login = document.getElementById('admin-login');
        const dash = document.getElementById('admin-dashboard');
        if (login) {
            login.hidden = true;
            login.setAttribute('aria-hidden', 'true');
        }
        if (dash) {
            dash.hidden = false;
            dash.setAttribute('aria-hidden', 'false');
        }
        document.body.classList.remove('admin-logged-out');
        document.body.classList.add('admin-logged-in');
        loadResults();
        loadCandidates();
        // Answer key data loads on demand when admin opens Answer Key — not at login paint
        const ak = document.getElementById('answer-key-panel');
        if (ak) ak.hidden = true;
    }

    function renderCandidates(list) {
        const tbody = document.getElementById('candidates-body');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6">No candidate accounts yet.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(c => `
            <tr data-username="${c.username}">
                <td>${c.fullName || '—'}</td>
                <td>@${c.username}</td>
                <td>${c.email || '—'}</td>
                <td>${formatReferral(c)}</td>
                <td>${c.passwordResetEnabled ? '<span class="score-pill score-pill--high">Yes</span>' : 'No'}</td>
                <td>
                    <div class="admin-actions">
                        <button type="button" class="btn-admin" data-action="pw-enable" data-username="${c.username}" ${c.passwordResetEnabled ? 'disabled' : ''}>Enable reset</button>
                        <button type="button" class="btn-admin" data-action="pw-disable" data-username="${c.username}" ${!c.passwordResetEnabled ? 'disabled' : ''}>Disable</button>
                        <button type="button" class="btn-admin btn-admin--reattempt" data-action="pw-temp" data-username="${c.username}">Temp password</button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                if (btn.dataset.action === 'pw-enable') handlePasswordReset(username, 'enable');
                else if (btn.dataset.action === 'pw-disable') handlePasswordReset(username, 'disable');
                else if (btn.dataset.action === 'pw-temp') handleTempPassword(username);
            });
        });
    }

    async function loadCandidates() {
        const tbody = document.getElementById('candidates-body');
        if (!tbody) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminCandidates(token);
        if (!ok) {
            tbody.innerHTML = '<tr><td colspan="5">Could not load candidate accounts.</td></tr>';
            return;
        }
        renderCandidates(data.candidates || []);
    }

    async function handlePasswordReset(username, action) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminPasswordReset(token, { username, action });
        if (!ok) {
            showToast(data.message || data.error || 'Action failed.', 'error');
            return;
        }
        showToast(data.message || 'Updated.', 'success');
        loadCandidates();
    }

    async function handleTempPassword(username) {
        if (!confirm(`Generate a temporary password for @${username}? Share it only with the candidate through a secure channel.`)) return;
        const token = sessionStorage.getItem(TOKEN_KEY);
        const { ok, data } = await window.TrinitasAPI.adminPasswordReset(token, { username, action: 'set-temp' });
        if (!ok) {
            showToast(data.message || data.error || 'Could not set password.', 'error');
            return;
        }
        const temp = data.temporaryPassword || '';
        if (temp) {
            try {
                await navigator.clipboard.writeText(temp);
                showToast(`Temporary password copied: ${temp}`, 'success');
            } catch {
                window.prompt('Temporary password (copy and share securely):', temp);
                showToast(data.message || 'Temporary password set.', 'success');
            }
        } else {
            showToast(data.message || 'Temporary password set.', 'success');
        }
        loadCandidates();
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
                error.textContent = data?.error === 'Invalid credentials'
                    ? 'Invalid admin ID or password.'
                    : (data?.message || data?.detail || data?.error || 'Unable to sign in. For local use, run netlify dev and sign in with Trinitas / Trinitas2026*.');
                error.hidden = false;
                return;
            }
            sessionStorage.setItem(TOKEN_KEY, data.token);
            await showDashboard();
        });

        document.getElementById('admin-logout').addEventListener('click', () => {
            sessionStorage.removeItem(TOKEN_KEY);
            showLogin();
        });

        document.getElementById('admin-refresh').addEventListener('click', loadResults);
        const refreshPaused = document.getElementById('refresh-paused');
        if (refreshPaused) refreshPaused.addEventListener('click', loadPaused);
        const refreshResumes = document.getElementById('refresh-resumes');
        if (refreshResumes) refreshResumes.addEventListener('click', loadResumes);

        const practiceBtn = document.getElementById('admin-practice');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                const session = {
                    fullName: 'Admin Practice',
                    email: `admin.practice+${Date.now()}@trinitas.internal`,
                    phone: '0000000000',
                    attemptNumber: 1,
                    isAdminPractice: true,
                    registeredAt: new Date().toISOString()
                };
                sessionStorage.setItem('trinitas_assessment_session', JSON.stringify(session));
                window.open('assessment.html', '_blank');
            });
        }

        document.getElementById('toggle-answer-key').addEventListener('click', async () => {
            const panel = document.getElementById('answer-key-panel');
            const visible = !panel.hidden;
            if (visible) {
                panel.hidden = true;
                document.getElementById('toggle-answer-key').textContent = 'Answer Key';
                return;
            }
            const ready = await ensureAssessmentData();
            if (!ready) return;
            panel.hidden = false;
            document.getElementById('toggle-answer-key').textContent = 'Hide Answer Key';
            renderAnswerKey();
        });

        const refreshCandidates = document.getElementById('refresh-candidates');
        if (refreshCandidates) refreshCandidates.addEventListener('click', loadCandidates);
        const refreshPipeline = document.getElementById('refresh-pipeline');
        if (refreshPipeline) refreshPipeline.addEventListener('click', loadPipeline);
        const refreshHr = document.getElementById('refresh-hr');
        if (refreshHr) refreshHr.addEventListener('click', loadHrTeam);

        const adminPipeAdd = document.getElementById('admin-pipeline-add');
        if (adminPipeAdd) {
            adminPipeAdd.addEventListener('submit', async e => {
                e.preventDefault();
                const token = sessionStorage.getItem(TOKEN_KEY);
                const { ok, data } = await window.TrinitasAPI.pipelineUpdate(token, {
                    action: 'create',
                    fullName: adminPipeAdd.fullName.value.trim(),
                    email: adminPipeAdd.email.value.trim().toLowerCase(),
                    phone: adminPipeAdd.phone.value.trim(),
                    nextAction: adminPipeAdd.nextAction.value.trim() || 'Review and set screening plan.',
                    stage: 'applied',
                    source: 'admin'
                });
                if (!ok) {
                    showToast(data.message || data.error || 'Could not add.', 'error');
                    return;
                }
                adminPipeAdd.reset();
                showToast('Candidate added to pipeline.', 'success');
                loadPipeline();
            });
        }

        document.getElementById('refresh-audit')?.addEventListener('click', loadAudit);
        document.getElementById('refresh-interviews')?.addEventListener('click', loadInterviews);
        document.getElementById('btn-hr-invite')?.addEventListener('click', async () => {
            const token = sessionStorage.getItem(TOKEN_KEY);
            const { ok, data } = await window.TrinitasAPI.adminHrInvite(token, { days: 14 });
            const box = document.getElementById('hr-invite-display');
            if (!ok) {
                showToast(data.message || data.error || 'Could not create invite.', 'error');
                return;
            }
            if (box) {
                box.hidden = false;
                box.textContent = `Invite code: ${data.code} (expires ${formatPausedDate(data.expiresAt)}). Share only with trusted HR.`;
            }
            try {
                await navigator.clipboard.writeText(data.code);
                showToast(`Invite ${data.code} copied to clipboard.`, 'success');
            } catch {
                showToast(data.message || `Invite: ${data.code}`, 'success');
            }
            loadAudit();
        });

        document.getElementById('results-search')?.addEventListener('input', () => renderTable());
        document.getElementById('results-filter-attempt2')?.addEventListener('change', () => renderTable());
        initAdminTabs();
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

    document.addEventListener('DOMContentLoaded', async () => {
        initLogin();
        initDetailModal();
        if (sessionStorage.getItem(TOKEN_KEY)) {
            await showDashboard();
        } else {
            showLogin();
        }
    });
})();