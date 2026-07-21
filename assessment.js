(function () {
    'use strict';

    const SESSION_KEY = 'trinitas_assessment_session';
    const MAX_TAB_SWITCHES = 3;
    let data = null;

    let session = null;
    let sectionIndex = 0;
    let englishQuestionIndex = 0;
    let englishPhase = 'mcq';
    let readingPassageIndex = 0;
    let readingQuestionIndex = 0;
    let workplaceQuestionIndex = 0;
    let globalTimer = null;
    let sectionTimer = null;
    let globalSecondsLeft = 60 * 60;
    let sectionSecondsLeft = 0;
    let startedAt = Date.now();
    let tabSwitchCount = 0;
    let sessionEnded = false;
    let isSubmitting = false;

    const state = {
        grammar: { answers: [], score: 0, percent: 0 },
        fillBlank: { answers: [], score: 0, percent: 0 },
        reading: { answers: [], score: 0, percent: 0 },
        workplace: { answers: [], score: 0, percent: 0 },
        email: { topics: [], responses: [], scores: [], percent: 0, wordCounts: [] },
        typing: { rounds: [], bestWpm: 0, bestAccuracy: 0 },
        voice: { recordings: [], completionPercent: 0, validCount: 0 }
    };

    let emailTopicIndex = 0;
    let voiceRecordTimer = null;
    let voiceRecordSeconds = 0;

    function resolveAssessmentData(attemptNumber) {
        if (Number(attemptNumber) === 2 && window.ASSESSMENT_DATA_ATTEMPT2) {
            return window.ASSESSMENT_DATA_ATTEMPT2;
        }
        return window.ASSESSMENT_DATA;
    }

    function loadSession() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            window.location.href = 'careers.html';
            return false;
        }
        session = JSON.parse(raw);
        data = resolveAssessmentData(session.attemptNumber || 1);
        return true;
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateTimers() {
        const globalEl = document.getElementById('global-timer');
        const sectionEl = document.getElementById('section-timer');
        if (globalEl) globalEl.textContent = formatTime(globalSecondsLeft);
        if (sectionEl) sectionEl.textContent = formatTime(sectionSecondsLeft);
    }

    function startTimers(minutes) {
        sectionSecondsLeft = minutes * 60;
        updateTimers();
        clearInterval(globalTimer);
        clearInterval(sectionTimer);

        globalTimer = setInterval(() => {
            globalSecondsLeft -= 1;
            updateTimers();
            if (globalSecondsLeft <= 0 && !sessionEnded) finishAssessment(true);
        }, 1000);

        sectionTimer = setInterval(() => {
            sectionSecondsLeft -= 1;
            updateTimers();
            if (sectionSecondsLeft <= 0 && !sessionEnded) goNextSection(true);
        }, 1000);
    }

    function updateProgress() {
        const fill = document.getElementById('progress-fill');
        const label = document.getElementById('progress-label');
        const bar = document.getElementById('progress-bar');
        const pct = Math.round((sectionIndex / data.sections.length) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (label) label.textContent = `Section ${sectionIndex + 1} of ${data.sections.length}`;
        if (bar) bar.setAttribute('aria-valuenow', String(pct));
    }

    function hashSeed(str) {
        let h = 2166136261;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return Math.abs(h) || 1;
    }

    function seededShuffle(array, seed) {
        const arr = array.slice();
        let s = seed;
        for (let i = arr.length - 1; i > 0; i--) {
            s = (Math.imul(s, 1103515245) + 12345) >>> 0;
            const j = s % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function initEmailTopics() {
        const pool = data.emailTopics || [];
        if (!pool.length) {
            state.email.topics = [];
            return;
        }
        const seed = hashSeed((session.email || '') + '|' + (session.attemptNumber || 1) + '|' + (session.fullName || ''));
        state.email.topics = seededShuffle(pool, seed).slice(0, 3).map((t, i) => ({
            index: i + 1,
            title: t.title,
            scenario: t.scenario,
            minWords: t.minWords || 70
        }));
        state.email.responses = new Array(3).fill('');
        state.email.scores = new Array(3).fill(0);
        state.email.wordCounts = new Array(3).fill(0);
        emailTopicIndex = 0;
    }

    function countWords(text) {
        return String(text || '').trim().split(/\s+/).filter(Boolean).length;
    }

    function scoreEmailResponse(text, topic) {
        const trimmed = String(text || '').trim();
        const words = countWords(trimmed);
        const minW = topic.minWords || 70;
        let score = 0;

        if (words >= minW) score += 35;
        else if (words >= Math.floor(minW * 0.6)) score += 18;
        else if (words >= 25) score += 8;

        if (/^(dear|hi\b|hello\b|good\s+(morning|afternoon|evening)|to\s+whom)/im.test(trimmed)) score += 12;
        if (/(regards|sincerely|thank you|best wishes|yours\s+(truly|faithfully|sincerely)|warm regards)/i.test(trimmed)) score += 12;
        if ((trimmed.match(/[.!?]/g) || []).length >= 3) score += 12;
        if (/\n\s*\n/.test(trimmed) || trimmed.split('\n').filter(l => l.trim()).length >= 3) score += 10;
        if (words >= minW + 30) score += 10;
        if (words >= minW && !/(asap asap|do the needful|revert back|pls|plz)/i.test(trimmed)) score += 9;

        return Math.min(100, score);
    }

    function finalizeEmailScores() {
        if (!state.email.topics.length) {
            state.email.percent = 0;
            return;
        }
        state.email.scores = state.email.topics.map((topic, i) =>
            scoreEmailResponse(state.email.responses[i], topic)
        );
        state.email.wordCounts = state.email.responses.map(countWords);
        const avg = state.email.scores.reduce((a, b) => a + b, 0) / state.email.scores.length;
        state.email.percent = Math.round(avg);
    }

    function saveCurrentEmailResponse() {
        const ta = document.getElementById('email-compose');
        if (!ta || !state.email.topics.length) return;
        state.email.responses[emailTopicIndex] = ta.value;
        state.email.wordCounts[emailTopicIndex] = countWords(ta.value);
    }

    function renderEmailWriting() {
        setPanelCompact(false);
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        if (!state.email.topics.length) initEmailTopics();
        const topic = state.email.topics[emailTopicIndex];
        if (!topic) {
            panel.innerHTML = '<p class="section-desc">Email topics unavailable.</p>';
            return;
        }
        const existing = state.email.responses[emailTopicIndex] || '';
        const isLast = emailTopicIndex >= state.email.topics.length - 1;
        const words = countWords(existing);

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Email Writing</h2>
                <p class="section-desc">Write a professional email for each scenario. You will complete <strong>3 topics</strong> assigned to your session. Aim for clear structure: greeting, purpose, details, and closing.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft || section.minutes * 60)}</span></span>
            </div>
            <div class="grammar-pagination">
                <span>Email <strong>${emailTopicIndex + 1}</strong> of <strong>${state.email.topics.length}</strong></span>
            </div>
            <div class="email-topic-card">
                <h3>${topic.title}</h3>
                <p>${topic.scenario}</p>
            </div>
            <div class="email-meta-row">
                <span>Suggested minimum: <strong>${topic.minWords} words</strong></span>
                <span>Word count: <strong id="email-word-count">${words}</strong></span>
            </div>
            <textarea class="email-compose" id="email-compose" placeholder="Write your full email here…" spellcheck="true"></textarea>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="email-prev" ${emailTopicIndex === 0 ? 'hidden' : ''}>Previous</button>
                <button type="button" class="btn btn-primary" id="email-next">${isLast ? 'Continue to Typing' : 'Next Email'}</button>
            </div>
        `;

        const ta = document.getElementById('email-compose');
        const wc = document.getElementById('email-word-count');
        ta.value = existing;
        ta.addEventListener('input', () => {
            wc.textContent = String(countWords(ta.value));
        });
        ta.focus();

        document.getElementById('email-next').addEventListener('click', () => {
            saveCurrentEmailResponse();
            const text = state.email.responses[emailTopicIndex] || '';
            if (countWords(text) < 25) {
                ta.reportValidity?.();
                ta.setCustomValidity('Please write a fuller professional email (at least ~25 words).');
                ta.reportValidity();
                ta.setCustomValidity('');
                return;
            }
            if (isLast) {
                finalizeEmailScores();
                goNextSection();
                return;
            }
            emailTopicIndex += 1;
            renderEmailWriting();
        });

        const prev = document.getElementById('email-prev');
        if (prev) {
            prev.addEventListener('click', () => {
                saveCurrentEmailResponse();
                emailTopicIndex = Math.max(0, emailTopicIndex - 1);
                renderEmailWriting();
            });
        }
    }

    function ensureGrammarAnswers() {
        if (state.grammar.answers.length !== data.grammarQuestions.length) {
            state.grammar.answers = new Array(data.grammarQuestions.length).fill(null);
        }
    }

    function normalizeAnswer(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function ensureFillBlankAnswers() {
        if (state.fillBlank.answers.length !== data.fillBlankQuestions.length) {
            state.fillBlank.answers = new Array(data.fillBlankQuestions.length).fill('');
        }
    }

    function saveCurrentEnglishAnswer() {
        if (englishPhase === 'mcq') {
            const checked = document.querySelector('input[name="grammar-q"]:checked');
            if (checked) {
                state.grammar.answers[englishQuestionIndex] = parseInt(checked.value, 10);
            }
            return;
        }
        const input = document.getElementById('fill-blank-input');
        if (input) {
            state.fillBlank.answers[englishQuestionIndex] = input.value.trim();
        }
    }

    function finalizeGrammarScores() {
        ensureGrammarAnswers();
        let score = 0;
        data.grammarQuestions.forEach((item, i) => {
            if (state.grammar.answers[i] === item.answer) score += 1;
        });
        state.grammar.score = score;
        state.grammar.percent = Math.round((score / data.grammarQuestions.length) * 100);
    }

    function finalizeFillBlankScores() {
        ensureFillBlankAnswers();
        let score = 0;
        data.fillBlankQuestions.forEach((item, i) => {
            const user = normalizeAnswer(state.fillBlank.answers[i]);
            const accepted = (item.answers || []).map(normalizeAnswer);
            if (user && accepted.includes(user)) score += 1;
        });
        state.fillBlank.score = score;
        state.fillBlank.percent = Math.round((score / data.fillBlankQuestions.length) * 100);
    }

    function finalizeEnglishScores() {
        finalizeGrammarScores();
        finalizeFillBlankScores();
    }

    function getEnglishPercent() {
        const totalScore = (state.grammar.score || 0) + (state.fillBlank.score || 0);
        const totalQuestions = data.grammarQuestions.length + data.fillBlankQuestions.length;
        return Math.round((totalScore / totalQuestions) * 100);
    }

    function renderGrammar() {
        setPanelCompact(false);
        englishPhase = 'mcq';
        englishQuestionIndex = 0;
        ensureGrammarAnswers();
        ensureFillBlankAnswers();
        renderEnglishQuestion();
    }

    function renderEnglishQuestion() {
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const isMcq = englishPhase === 'mcq';
        const questions = isMcq ? data.grammarQuestions : data.fillBlankQuestions;
        const total = questions.length;
        const i = englishQuestionIndex;
        const item = questions[i];
        const isLastEnglish = isMcq && i === data.grammarQuestions.length - 1;
        const isLastFill = !isMcq && i === data.fillBlankQuestions.length - 1;

        const dots = questions.map((_, idx) => {
            let cls = 'grammar-progress-dot';
            const answered = isMcq
                ? state.grammar.answers[idx] !== null
                : Boolean(state.fillBlank.answers[idx]);
            if (answered) cls += ' grammar-progress-dot--done';
            if (idx === i) cls += ' grammar-progress-dot--current';
            return `<span class="${cls}" aria-hidden="true"></span>`;
        }).join('');

        const phaseLabel = isMcq ? 'Multiple Choice' : 'Fill in the Blank';
        const questionBody = isMcq
            ? `
                <fieldset class="grammar-q">
                    <legend>${item.q}</legend>
                    <div class="grammar-options">
                        ${item.options.map((opt, j) => `
                            <label>
                                <input type="radio" name="grammar-q" value="${j}" ${state.grammar.answers[i] === j ? 'checked' : ''} required>
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </fieldset>
            `
            : `
                <fieldset class="grammar-q fill-blank-q">
                    <legend>${item.q}</legend>
                    <input type="text" class="fill-blank-input" id="fill-blank-input" value="${state.fillBlank.answers[i] || ''}" placeholder="Type your answer" autocomplete="off" spellcheck="false" required>
                </fieldset>
            `;

        const nextLabel = isLastFill
            ? 'Continue to Reading'
            : isLastEnglish
                ? 'Continue to Fill in the Blanks'
                : 'Next Question';

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Basic English Assessment</h2>
                <p class="section-desc">${phaseLabel} — one question per page. You have ${section.minutes} minutes for this section. Do not switch tabs — 3 tab switches will end your session.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft || section.minutes * 60)}</span></span>
            </div>
            <div class="grammar-pagination">
                <span>${phaseLabel}: <strong>${i + 1}</strong> of <strong>${total}</strong></span>
                <div class="grammar-progress-dots">${dots}</div>
            </div>
            ${questionBody}
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="english-prev" ${i === 0 && isMcq ? 'hidden' : ''}>Previous</button>
                <button type="button" class="btn btn-primary" id="english-next">${nextLabel}</button>
            </div>
        `;

        if (!isMcq) {
            const fillInput = document.getElementById('fill-blank-input');
            fillInput.focus();
        }

        document.getElementById('english-next').addEventListener('click', () => {
            if (isMcq) {
                const checked = document.querySelector('input[name="grammar-q"]:checked');
                if (!checked) {
                    const firstRadio = document.querySelector('input[name="grammar-q"]');
                    if (firstRadio) firstRadio.reportValidity();
                    return;
                }
                saveCurrentEnglishAnswer();
                if (isLastEnglish) {
                    englishPhase = 'fill';
                    englishQuestionIndex = 0;
                    renderEnglishQuestion();
                    return;
                }
                englishQuestionIndex += 1;
                renderEnglishQuestion();
                return;
            }

            const fillInput = document.getElementById('fill-blank-input');
            if (!fillInput.value.trim()) {
                fillInput.reportValidity();
                return;
            }
            saveCurrentEnglishAnswer();
            if (isLastFill) {
                finalizeEnglishScores();
                goNextSection();
                return;
            }
            englishQuestionIndex += 1;
            renderEnglishQuestion();
        });

        const prevBtn = document.getElementById('english-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                saveCurrentEnglishAnswer();
                if (!isMcq && i === 0) {
                    englishPhase = 'mcq';
                    englishQuestionIndex = data.grammarQuestions.length - 1;
                } else {
                    englishQuestionIndex = Math.max(0, englishQuestionIndex - 1);
                }
                renderEnglishQuestion();
            });
        }
    }

    function updateTabWarning() {
        const banner = document.getElementById('tab-warning');
        const text = document.getElementById('tab-warning-text');
        if (!banner || !text) return;

        if (tabSwitchCount === 0) {
            banner.hidden = true;
            return;
        }

        banner.hidden = false;
        banner.classList.toggle('tab-warning--danger', tabSwitchCount >= MAX_TAB_SWITCHES - 1);

        if (tabSwitchCount >= MAX_TAB_SWITCHES) {
            text.textContent = 'Session ended: you left this tab too many times.';
        } else if (tabSwitchCount === MAX_TAB_SWITCHES - 1) {
            text.textContent = `Warning: you have left this tab ${tabSwitchCount} time(s). One more switch will end your session.`;
        } else {
            text.textContent = `Warning: you left this tab ${tabSwitchCount} time(s). ${MAX_TAB_SWITCHES - tabSwitchCount} switch(es) remaining before your session ends.`;
        }
    }

    function initTabDetection() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden || sessionEnded || isSubmitting) return;
            tabSwitchCount += 1;
            updateTabWarning();
            if (tabSwitchCount >= MAX_TAB_SWITCHES) {
                endSessionDueToTabSwitch();
            }
        });
    }

    function endSessionDueToTabSwitch() {
        if (sessionEnded || isSubmitting) return;
        sessionEnded = true;
        clearInterval(globalTimer);
        clearInterval(sectionTimer);
        saveCurrentEnglishAnswer();
        saveCurrentReadingAnswer();
        saveCurrentWorkplaceAnswer();
        const panel = document.getElementById('assessment-content');
        panel.innerHTML = `
            <div class="form-alert form-alert--error" style="display:block">
                <h2 style="margin-bottom:0.5rem">Session Ended</h2>
                <p>Your assessment was terminated because you left this tab more than ${MAX_TAB_SWITCHES} times. Your partial responses are being submitted.</p>
            </div>
        `;
        finishAssessment(false, 'tab-switch');
    }

    function getReadingQuestionsTotal() {
        return data.readingPassages.reduce((sum, p) => sum + p.questions.length, 0);
    }

    function getReadingFlatIndex(passageIdx, questionIdx) {
        let idx = 0;
        for (let p = 0; p < passageIdx; p++) idx += data.readingPassages[p].questions.length;
        return idx + questionIdx;
    }

    function ensureReadingAnswers() {
        const total = getReadingQuestionsTotal();
        if (state.reading.answers.length !== total) {
            state.reading.answers = new Array(total).fill(null);
        }
    }

    function saveCurrentReadingAnswer() {
        const checked = document.querySelector('input[name="reading-q"]:checked');
        if (checked) {
            const flat = getReadingFlatIndex(readingPassageIndex, readingQuestionIndex);
            state.reading.answers[flat] = parseInt(checked.value, 10);
        }
    }

    function finalizeReadingScores() {
        ensureReadingAnswers();
        let score = 0;
        data.readingPassages.forEach((passage, pIdx) => {
            passage.questions.forEach((item, qIdx) => {
                const flat = getReadingFlatIndex(pIdx, qIdx);
                if (state.reading.answers[flat] === item.answer) score += 1;
            });
        });
        state.reading.score = score;
        state.reading.percent = Math.round((score / getReadingQuestionsTotal()) * 100);
    }

    function renderReading() {
        setPanelCompact(false);
        ensureReadingAnswers();
        renderReadingQuestion();
    }

    function renderReadingQuestion() {
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const passageData = data.readingPassages[readingPassageIndex];
        const totalPassages = data.readingPassages.length;
        const totalQuestions = passageData.questions.length;
        const item = passageData.questions[readingQuestionIndex];
        const flat = getReadingFlatIndex(readingPassageIndex, readingQuestionIndex);
        const selected = state.reading.answers[flat];
        const isLastPassage = readingPassageIndex === totalPassages - 1;
        const isLastQuestion = readingQuestionIndex === totalQuestions - 1;

        const nextLabel = isLastPassage && isLastQuestion
            ? 'Continue to Workplace Assessment'
            : 'Next Question';

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Reading Comprehension</h2>
                <p class="section-desc">Read the passage carefully, then answer each question. Passage ${readingPassageIndex + 1} of ${totalPassages}.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft || section.minutes * 60)}</span></span>
            </div>
            <div class="reading-passage-box">
                <h3 class="reading-passage-title">${passageData.title}</h3>
                <p class="reading-passage-text">${passageData.passage}</p>
            </div>
            <div class="grammar-pagination">
                <span>Question <strong>${readingQuestionIndex + 1}</strong> of <strong>${totalQuestions}</strong></span>
            </div>
            <fieldset class="grammar-q">
                <legend>${item.q}</legend>
                <div class="grammar-options">
                    ${item.options.map((opt, j) => `
                        <label>
                            <input type="radio" name="reading-q" value="${j}" ${selected === j ? 'checked' : ''} required>
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </fieldset>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="reading-prev" ${readingPassageIndex === 0 && readingQuestionIndex === 0 ? 'hidden' : ''}>Previous</button>
                <button type="button" class="btn btn-primary" id="reading-next">${nextLabel}</button>
            </div>
        `;

        document.getElementById('reading-next').addEventListener('click', () => {
            const checked = document.querySelector('input[name="reading-q"]:checked');
            if (!checked) {
                const firstRadio = document.querySelector('input[name="reading-q"]');
                if (firstRadio) firstRadio.reportValidity();
                return;
            }
            saveCurrentReadingAnswer();
            if (isLastPassage && isLastQuestion) {
                finalizeReadingScores();
                goNextSection();
                return;
            }
            if (readingQuestionIndex < totalQuestions - 1) {
                readingQuestionIndex += 1;
            } else {
                readingPassageIndex += 1;
                readingQuestionIndex = 0;
            }
            renderReadingQuestion();
        });

        const prevBtn = document.getElementById('reading-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                saveCurrentReadingAnswer();
                if (readingQuestionIndex > 0) {
                    readingQuestionIndex -= 1;
                } else {
                    readingPassageIndex -= 1;
                    readingQuestionIndex = data.readingPassages[readingPassageIndex].questions.length - 1;
                }
                renderReadingQuestion();
            });
        }
    }

    function ensureWorkplaceAnswers() {
        if (state.workplace.answers.length !== data.workplaceQuestions.length) {
            state.workplace.answers = new Array(data.workplaceQuestions.length).fill(null);
        }
    }

    function saveCurrentWorkplaceAnswer() {
        const checked = document.querySelector('input[name="workplace-q"]:checked');
        if (checked) {
            state.workplace.answers[workplaceQuestionIndex] = parseInt(checked.value, 10);
        }
    }

    function finalizeWorkplaceScores() {
        ensureWorkplaceAnswers();
        let score = 0;
        data.workplaceQuestions.forEach((item, i) => {
            if (state.workplace.answers[i] === item.answer) score += 1;
        });
        state.workplace.score = score;
        state.workplace.percent = Math.round((score / data.workplaceQuestions.length) * 100);
    }

    function renderWorkplace() {
        setPanelCompact(false);
        workplaceQuestionIndex = 0;
        ensureWorkplaceAnswers();
        renderWorkplaceQuestion();
    }

    function renderWorkplaceQuestion() {
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const total = data.workplaceQuestions.length;
        const i = workplaceQuestionIndex;
        const item = data.workplaceQuestions[i];
        const selected = state.workplace.answers[i];
        const isLast = i === total - 1;

        const dots = data.workplaceQuestions.map((_, idx) => {
            let cls = 'grammar-progress-dot';
            if (state.workplace.answers[idx] !== null) cls += ' grammar-progress-dot--done';
            if (idx === i) cls += ' grammar-progress-dot--current';
            return `<span class="${cls}" aria-hidden="true"></span>`;
        }).join('');

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Workplace &amp; Psychology</h2>
                <p class="section-desc">Choose the best response for each workplace scenario. One question per page.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft || section.minutes * 60)}</span></span>
            </div>
            <div class="grammar-pagination">
                <span>Question <strong>${i + 1}</strong> of <strong>${total}</strong></span>
                <div class="grammar-progress-dots">${dots}</div>
            </div>
            <fieldset class="grammar-q">
                <legend>${item.q}</legend>
                <div class="grammar-options">
                    ${item.options.map((opt, j) => `
                        <label>
                            <input type="radio" name="workplace-q" value="${j}" ${selected === j ? 'checked' : ''} required>
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </fieldset>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="workplace-prev" ${i === 0 ? 'hidden' : ''}>Previous</button>
                <button type="button" class="btn btn-primary" id="workplace-next">${isLast ? 'Continue to Email Writing' : 'Next Question'}</button>
            </div>
        `;

        document.getElementById('workplace-next').addEventListener('click', () => {
            const checked = document.querySelector('input[name="workplace-q"]:checked');
            if (!checked) {
                const firstRadio = document.querySelector('input[name="workplace-q"]');
                if (firstRadio) firstRadio.reportValidity();
                return;
            }
            saveCurrentWorkplaceAnswer();
            if (isLast) {
                finalizeWorkplaceScores();
                goNextSection();
                return;
            }
            workplaceQuestionIndex += 1;
            renderWorkplaceQuestion();
        });

        const prevBtn = document.getElementById('workplace-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                saveCurrentWorkplaceAnswer();
                workplaceQuestionIndex = Math.max(0, workplaceQuestionIndex - 1);
                renderWorkplaceQuestion();
            });
        }
    }

    let typingStart = null;

    function setPanelCompact(compact) {
        const panel = document.getElementById('assessment-content');
        panel.classList.toggle('assessment-panel--compact', compact);
    }

    function blockTypingClipboard(event) {
        event.preventDefault();
    }

    function bindTypingInputGuards(input, display) {
        const blockShortcut = (event) => {
            const key = event.key?.toLowerCase();
            if (event.ctrlKey || event.metaKey) {
                if (key === 'v' || key === 'c' || key === 'x') {
                    event.preventDefault();
                }
            }
            if (event.shiftKey && key === 'insert') {
                event.preventDefault();
            }
        };

        input.addEventListener('paste', blockTypingClipboard);
        input.addEventListener('copy', blockTypingClipboard);
        input.addEventListener('cut', blockTypingClipboard);
        input.addEventListener('drop', blockTypingClipboard);
        input.addEventListener('contextmenu', blockTypingClipboard);
        input.addEventListener('keydown', blockShortcut);
        input.addEventListener('beforeinput', (event) => {
            if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') {
                event.preventDefault();
            }
        });

        if (display) {
            display.addEventListener('copy', blockTypingClipboard);
            display.addEventListener('cut', blockTypingClipboard);
            display.addEventListener('contextmenu', blockTypingClipboard);
        }
    }

    function renderTypingDisplay(passage, typed) {
        let html = '';
        for (let i = 0; i < passage.length; i++) {
            let cls = '';
            if (i < typed.length) {
                cls = typed[i] === passage[i] ? 'typed-correct' : 'typed-wrong';
            } else if (i === typed.length) {
                cls = 'current-char';
            }
            html += `<span class="${cls}">${passage[i]}</span>`;
        }
        return html;
    }

    function saveTypingProgress() {
        const input = document.getElementById('typing-input');
        if (!input) return;
        const passage = data.typingPassage;
        const typed = input.value;
        const elapsedSec = typingStart ? (Date.now() - typingStart) / 1000 : 0;
        const stats = calcTypingStats(passage, typed, elapsedSec);
        state.typing.rounds = [{ passage: 1, ...stats, typedText: typed }];
        state.typing.bestWpm = stats.wpm;
        state.typing.bestAccuracy = stats.accuracy;
    }

    function calcTypingStats(passage, typed, elapsedSec) {
        let correct = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === passage[i]) correct += 1;
        }
        const words = typed.trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(elapsedSec / 60, 1 / 60);
        const wpm = Math.round(words / minutes);
        const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 0;
        return { wpm, accuracy, words, elapsedSec };
    }

    function renderTyping() {
        setPanelCompact(true);
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const passage = data.typingPassage;

        panel.innerHTML = `
            <div class="typing-section">
                <div class="section-intro">
                    <h2>Typing Speed Assessment</h2>
                    <p class="section-desc">Type the 6-line passage exactly as shown. Copy and paste are disabled. Time: <strong>${section.minutes} min</strong>.</p>
                    <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(section.minutes * 60)}</span></span>
                </div>
                <div class="typing-display typing-display--multiline typing-display--compact" id="typing-display"></div>
                <textarea class="typing-input typing-input--compact" id="typing-input" rows="6" placeholder="Type here..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
                <div class="typing-stats typing-stats--compact">
                    <span>WPM: <strong id="stat-wpm">0</strong></span>
                    <span>Accuracy: <strong id="stat-accuracy">0%</strong></span>
                    <span>Progress: <strong id="stat-progress">0%</strong></span>
                </div>
                <div class="assessment-actions">
                    <span></span>
                    <button type="button" class="btn btn-primary" id="typing-next">Continue to Voice</button>
                </div>
            </div>
        `;

        const input = document.getElementById('typing-input');
        const display = document.getElementById('typing-display');
        typingStart = Date.now();
        bindTypingInputGuards(input, display);
        input.focus();

        function onInput() {
            const typed = input.value;
            const stats = calcTypingStats(passage, typed, (Date.now() - typingStart) / 1000);
            document.getElementById('stat-wpm').textContent = stats.wpm;
            document.getElementById('stat-accuracy').textContent = `${stats.accuracy}%`;
            const progress = Math.min(100, Math.round((typed.length / passage.length) * 100));
            document.getElementById('stat-progress').textContent = `${progress}%`;
            display.innerHTML = renderTypingDisplay(passage, typed);
        }

        input.addEventListener('input', onInput);
        display.innerHTML = renderTypingDisplay(passage, '');

        function completeTyping() {
            saveTypingProgress();
            goNextSection();
        }

        document.getElementById('typing-next').addEventListener('click', completeTyping);
    }

    let voiceRound = 0;
    let mediaRecorder = null;
    let audioChunks = [];

    function isVoiceValid(rec, promptItem) {
        if (!rec) return false;
        const minDur = promptItem.minDuration || 3;
        const minBytes = promptItem.minBytes || (minDur * 1200);
        return rec.durationSec >= minDur && (rec.byteSize || 0) >= minBytes;
    }

    function clearVoiceRecordTimer() {
        if (voiceRecordTimer) {
            clearInterval(voiceRecordTimer);
            voiceRecordTimer = null;
        }
        voiceRecordSeconds = 0;
    }

    async function renderVoice() {
        setPanelCompact(false);
        clearVoiceRecordTimer();
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const promptItem = data.voicePrompts[voiceRound];
        const prompt = promptItem.text;
        const promptLabel = { word: 'Word', phrase: 'Phrase', sentence: 'Sentence', long: 'Extended passage' }[promptItem.type] || 'Prompt';
        const existing = state.voice.recordings[voiceRound];
        const minDur = promptItem.minDuration || 3;
        const validExisting = isVoiceValid(existing, promptItem);

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Voice Assessment</h2>
                <p class="section-desc">${promptLabel} <strong>${voiceRound + 1}</strong> of <strong>${data.voicePrompts.length}</strong>. Read the prompt aloud clearly. Recordings shorter than the minimum time, or without sufficient audio, will not be accepted.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft)}</span></span>
            </div>
            <div class="voice-req">
                <span class="voice-req-chip">Min. ${minDur}s recording</span>
                <span class="voice-req-chip">Audible speech required</span>
                <span class="voice-req-chip ${validExisting ? 'voice-req-chip--ok' : 'voice-req-chip--warn'}" id="voice-valid-chip">${validExisting ? 'Accepted' : 'Not yet accepted'}</span>
            </div>
            <div class="voice-prompt-box voice-prompt-box--${promptItem.type}">${prompt}</div>
            <div class="voice-controls">
                <button type="button" class="btn btn-primary" id="voice-record">${existing ? 'Re-record' : 'Start Recording'}</button>
                <button type="button" class="btn btn-secondary" id="voice-stop" disabled>Stop</button>
                <span class="voice-live-timer" id="voice-live-timer" hidden>0s</span>
                <span class="voice-status" id="voice-status">${validExisting ? `Accepted (${existing.durationSec}s)` : existing ? 'Too short / weak audio — re-record' : 'Ready'}</span>
            </div>
            <audio class="voice-playback" id="voice-playback" controls ${existing && existing.url ? '' : 'hidden'}></audio>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="voice-back" ${voiceRound === 0 ? 'hidden' : ''}>Previous Prompt</button>
                <button type="button" class="btn btn-primary" id="voice-next" ${validExisting ? '' : 'disabled'}>${voiceRound >= data.voicePrompts.length - 1 ? 'Submit Assessment' : 'Next Prompt'}</button>
            </div>
        `;

        const statusEl = document.getElementById('voice-status');
        const playback = document.getElementById('voice-playback');
        const recordBtn = document.getElementById('voice-record');
        const stopBtn = document.getElementById('voice-stop');
        const nextBtn = document.getElementById('voice-next');
        const liveTimer = document.getElementById('voice-live-timer');
        const validChip = document.getElementById('voice-valid-chip');

        if (existing && existing.url) {
            playback.src = existing.url;
            playback.hidden = false;
        }

        recordBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
                audioChunks = [];
                const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : MediaRecorder.isTypeSupported('audio/webm')
                        ? 'audio/webm'
                        : '';
                mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
                const startTime = Date.now();
                clearVoiceRecordTimer();
                voiceRecordSeconds = 0;
                liveTimer.hidden = false;
                liveTimer.textContent = '0s';
                voiceRecordTimer = setInterval(() => {
                    voiceRecordSeconds += 1;
                    liveTimer.textContent = `${voiceRecordSeconds}s`;
                    if (voiceRecordSeconds >= minDur) liveTimer.style.color = '#047857';
                }, 1000);

                mediaRecorder.ondataavailable = e => {
                    if (e.data && e.data.size > 0) audioChunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    clearVoiceRecordTimer();
                    liveTimer.hidden = true;
                    liveTimer.style.color = '';
                    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
                    const rec = {
                        prompt: voiceRound + 1,
                        type: promptItem.type,
                        text: prompt,
                        durationSec,
                        byteSize: blob.size,
                        url,
                        completed: false
                    };
                    rec.completed = isVoiceValid(rec, promptItem);
                    state.voice.recordings[voiceRound] = rec;
                    playback.src = url;
                    playback.hidden = false;

                    if (rec.completed) {
                        statusEl.textContent = `Accepted (${durationSec}s)`;
                        statusEl.className = 'voice-status done';
                        validChip.textContent = 'Accepted';
                        validChip.className = 'voice-req-chip voice-req-chip--ok';
                        nextBtn.disabled = false;
                    } else {
                        const reasons = [];
                        if (durationSec < minDur) reasons.push(`need ≥ ${minDur}s (got ${durationSec}s)`);
                        if ((rec.byteSize || 0) < (promptItem.minBytes || minDur * 1200)) reasons.push('audio too weak/silent');
                        statusEl.textContent = `Not accepted: ${reasons.join('; ')}. Re-record.`;
                        statusEl.className = 'voice-status';
                        validChip.textContent = 'Not yet accepted';
                        validChip.className = 'voice-req-chip voice-req-chip--warn';
                        nextBtn.disabled = true;
                    }
                    stream.getTracks().forEach(t => t.stop());
                    recordBtn.disabled = false;
                    stopBtn.disabled = true;
                };

                mediaRecorder.start(250);
                statusEl.textContent = 'Recording… speak clearly';
                statusEl.className = 'voice-status recording';
                recordBtn.disabled = true;
                stopBtn.disabled = false;
                nextBtn.disabled = true;
            } catch {
                clearVoiceRecordTimer();
                statusEl.textContent = 'Microphone access denied — enable mic permissions and try again';
                statusEl.className = 'voice-status';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                if (voiceRecordSeconds < minDur) {
                    statusEl.textContent = `Keep speaking — minimum ${minDur}s required (${voiceRecordSeconds}s so far)`;
                    statusEl.className = 'voice-status recording';
                    return;
                }
                mediaRecorder.stop();
            }
        });

        nextBtn.addEventListener('click', () => {
            const rec = state.voice.recordings[voiceRound];
            if (!isVoiceValid(rec, promptItem)) return;
            voiceRound += 1;
            if (voiceRound < data.voicePrompts.length) {
                renderVoice();
            } else {
                finishAssessment();
            }
        });

        const backBtn = document.getElementById('voice-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                clearVoiceRecordTimer();
                if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
                voiceRound = Math.max(0, voiceRound - 1);
                renderVoice();
            });
        }
    }

    function renderSection() {
        updateProgress();
        const section = data.sections[sectionIndex];
        document.getElementById('section-name').textContent = section.label;

        if (section.id === 'grammar') renderGrammar();
        else if (section.id === 'reading') { readingPassageIndex = 0; readingQuestionIndex = 0; renderReading(); }
        else if (section.id === 'workplace') renderWorkplace();
        else if (section.id === 'email') { emailTopicIndex = 0; renderEmailWriting(); }
        else if (section.id === 'typing') renderTyping();
        else if (section.id === 'voice') { voiceRound = 0; renderVoice(); }
        startTimers(section.minutes);
    }

    function goNextSection(force) {
        if (sessionEnded || isSubmitting) return;
        if (!force && sectionIndex >= data.sections.length - 1) return;
        clearInterval(sectionTimer);
        clearVoiceRecordTimer();

        const currentSection = data.sections[sectionIndex];
        if (currentSection.id === 'grammar') {
            saveCurrentEnglishAnswer();
            finalizeEnglishScores();
        } else if (currentSection.id === 'reading') {
            saveCurrentReadingAnswer();
            finalizeReadingScores();
        } else if (currentSection.id === 'workplace') {
            saveCurrentWorkplaceAnswer();
            finalizeWorkplaceScores();
        } else if (currentSection.id === 'email') {
            saveCurrentEmailResponse();
            finalizeEmailScores();
        } else if (currentSection.id === 'typing') {
            saveTypingProgress();
        }

        sectionIndex += 1;
        if (sectionIndex >= data.sections.length) {
            finishAssessment(force);
            return;
        }
        renderSection();
    }

    function getSectionScore(sectionId) {
        if (sectionId === 'grammar') return getEnglishPercent();
        if (sectionId === 'reading') return state.reading.percent || 0;
        if (sectionId === 'workplace') return state.workplace.percent || 0;
        if (sectionId === 'email') {
            finalizeEmailScores();
            return state.email.percent || 0;
        }
        if (sectionId === 'typing') {
            const wpmScore = Math.min(100, Math.round((state.typing.bestWpm / 55) * 100));
            const acc = state.typing.bestAccuracy || 0;
            return Math.round(wpmScore * 0.65 + acc * 0.35);
        }
        if (sectionId === 'voice') {
            const total = data.voicePrompts.length || 1;
            let points = 0;
            data.voicePrompts.forEach((p, i) => {
                const rec = state.voice.recordings[i];
                if (!rec) return;
                if (isVoiceValid(rec, p)) {
                    points += 1;
                    if (rec.durationSec >= (p.minDuration || 0) + 2) points += 0.15;
                } else if (rec.durationSec > 0) {
                    points += 0.15;
                }
            });
            const maxPoints = total * 1.15;
            state.voice.validCount = state.voice.recordings.filter((r, i) => isVoiceValid(r, data.voicePrompts[i])).length;
            state.voice.completionPercent = Math.round(Math.min(100, (points / maxPoints) * 100));
            return state.voice.completionPercent;
        }
        return 0;
    }

    function computeOverall() {
        finalizeEnglishScores();
        finalizeReadingScores();
        finalizeWorkplaceScores();
        finalizeEmailScores();
        return Math.round(
            data.sections.reduce((sum, s) => sum + getSectionScore(s.id) * s.weight, 0)
        );
    }

    async function finishAssessment(timedOut, terminatedReason) {
        if (isSubmitting) return;
        isSubmitting = true;
        sessionEnded = true;

        clearInterval(globalTimer);
        clearInterval(sectionTimer);

        const panel = document.getElementById('assessment-content');
        if (!terminatedReason) {
            panel.innerHTML = `<p class="section-desc">Submitting your assessment...</p>`;
        }

        const currentSection = data.sections[sectionIndex];
        if (currentSection?.id === 'grammar') {
            saveCurrentEnglishAnswer();
            finalizeEnglishScores();
        } else if (currentSection?.id === 'reading') {
            saveCurrentReadingAnswer();
            finalizeReadingScores();
        } else if (currentSection?.id === 'workplace') {
            saveCurrentWorkplaceAnswer();
            finalizeWorkplaceScores();
        } else if (currentSection?.id === 'email') {
            saveCurrentEmailResponse();
            finalizeEmailScores();
        } else if (currentSection?.id === 'typing') {
            saveTypingProgress();
        }

        const overallScore = computeOverall();
        const durationMinutes = Math.round((Date.now() - startedAt) / 60000);

        const payload = {
            ...session,
            attemptNumber: session.attemptNumber || 1,
            durationMinutes,
            timedOut: !!timedOut,
            terminatedReason: terminatedReason || null,
            tabSwitchCount,
            overallScore,
            grammar: state.grammar,
            fillBlank: state.fillBlank,
            englishPercent: getEnglishPercent(),
            reading: state.reading,
            workplace: state.workplace,
            email: {
                percent: state.email.percent,
                topics: state.email.topics,
                responses: state.email.responses,
                scores: state.email.scores,
                wordCounts: state.email.wordCounts
            },
            typing: {
                bestWpm: state.typing.bestWpm,
                bestAccuracy: state.typing.bestAccuracy,
                rounds: state.typing.rounds,
                avgWpm: state.typing.rounds.length
                    ? Math.round(state.typing.rounds.reduce((a, r) => a + r.wpm, 0) / state.typing.rounds.length)
                    : 0
            },
            voice: {
                completionPercent: state.voice.completionPercent,
                validCount: state.voice.validCount,
                prompts: state.voice.recordings.map(r => ({
                    prompt: r.prompt,
                    type: r.type,
                    text: r.text,
                    durationSec: r.durationSec,
                    byteSize: r.byteSize || 0,
                    completed: !!r.completed
                }))
            }
        };

        const { ok, data: res } = await window.TrinitasAPI.submitAssessment(payload);

        if (!ok) {
            isSubmitting = false;
            sessionEnded = false;
            panel.innerHTML = `
                <div class="form-alert form-alert--error" style="display:block">
                    <p>${res.message || 'Submission failed.'} Please contact <a href="mailto:info@trinitasnxt.in">info@trinitasnxt.in</a>.</p>
                </div>
                <button type="button" class="btn btn-primary" id="retry-submit" style="margin-top:1rem">Retry Submit</button>
            `;
            document.getElementById('retry-submit').addEventListener('click', () => finishAssessment(timedOut, terminatedReason));
            return;
        }

        sessionStorage.removeItem(SESSION_KEY);
        const viaEmail = res.via === 'email';

        if (terminatedReason === 'tab-switch') {
            panel.innerHTML = `
                <div class="form-alert form-alert--error" style="display:block">
                    <h2 style="margin-bottom:0.5rem">Session Ended</h2>
                    <p>Your assessment was terminated because you left this tab more than ${MAX_TAB_SWITCHES} times. Your partial responses have been recorded and our recruitment team has been notified.</p>
                </div>
                <a href="careers.html" class="btn btn-primary" style="margin-top:1.5rem">Back to Careers</a>
            `;
            return;
        }

        panel.innerHTML = `
            <div class="form-alert form-alert--success" style="display:block">
                <h2 style="margin-bottom:0.5rem">Assessment Submitted</h2>
                <p>Thank you, ${session.fullName}. Your preliminary assessment has been recorded. Our recruitment team will review your submission and contact you if your profile matches current openings.</p>
                ${viaEmail ? '<p style="margin-top:0.5rem;font-size:0.88rem">A copy was sent to our recruitment inbox.</p>' : ''}
            </div>
            <a href="careers.html" class="btn btn-primary" style="margin-top:1.5rem">Back to Careers</a>
        `;
    }

    function init() {
        if (!loadSession()) return;

        document.getElementById('candidate-name').textContent = session.fullName;
        document.getElementById('candidate-email').textContent = session.email;
        const attemptLabel = data.attemptLabel || (session.attemptNumber === 2 ? 'Attempt 2' : 'Attempt 1');
        const badge = document.getElementById('attempt-badge');
        if (badge) badge.textContent = attemptLabel;
        initEmailTopics();
        startedAt = Date.now();
        globalSecondsLeft = data.totalMinutes * 60;
        updateTimers();
        initTabDetection();
        renderSection();
    }

    document.addEventListener('DOMContentLoaded', init);
})();