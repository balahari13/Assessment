(function () {
    'use strict';

    const SESSION_KEY = 'trinitas_assessment_session';
    const MAX_TAB_SWITCHES = 3;
    const data = window.ASSESSMENT_DATA;

    let session = null;
    let sectionIndex = 0;
    let englishQuestionIndex = 0;
    let englishPhase = 'mcq';
    let readingPassageIndex = 0;
    let readingQuestionIndex = 0;
    let workplaceQuestionIndex = 0;
    let globalTimer = null;
    let sectionTimer = null;
    let globalSecondsLeft = data.totalMinutes * 60;
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
        typing: { rounds: [], bestWpm: 0, bestAccuracy: 0 },
        voice: { recordings: [], completionPercent: 0 }
    };

    function loadSession() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            window.location.href = 'careers.html';
            return false;
        }
        session = JSON.parse(raw);
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
        const pct = Math.round(((sectionIndex) / data.sections.length) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (label) label.textContent = `Section ${sectionIndex + 1} of ${data.sections.length}`;
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
                <button type="button" class="btn btn-primary" id="workplace-next">${isLast ? 'Continue to Typing' : 'Next Question'}</button>
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

    async function renderVoice() {
        setPanelCompact(false);
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const promptItem = data.voicePrompts[voiceRound];
        const prompt = promptItem.text;
        const promptLabel = { word: 'Word', phrase: 'Phrase', sentence: 'Sentence', long: 'Extended sentence' }[promptItem.type] || 'Prompt';
        const existing = state.voice.recordings[voiceRound];

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Voice Assessment</h2>
                <p class="section-desc">${promptLabel} ${voiceRound + 1} of ${data.voicePrompts.length}. Read clearly at a professional pace. Allow microphone access when prompted.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft)}</span></span>
            </div>
            <div class="voice-prompt-box voice-prompt-box--${promptItem.type}">${prompt}</div>
            <div class="voice-controls">
                <button type="button" class="btn btn-primary" id="voice-record">${existing ? 'Re-record' : 'Start Recording'}</button>
                <button type="button" class="btn btn-secondary" id="voice-stop" disabled>Stop</button>
                <span class="voice-status" id="voice-status">${existing ? 'Recording saved' : 'Ready'}</span>
            </div>
            <audio class="voice-playback" id="voice-playback" controls ${existing ? '' : 'hidden'}></audio>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="voice-back" ${voiceRound === 0 ? 'hidden' : ''}>Previous Prompt</button>
                <button type="button" class="btn btn-primary" id="voice-next" ${existing ? '' : 'disabled'}>${voiceRound >= data.voicePrompts.length - 1 ? 'Submit Assessment' : 'Next Prompt'}</button>
            </div>
        `;

        const statusEl = document.getElementById('voice-status');
        const playback = document.getElementById('voice-playback');
        const recordBtn = document.getElementById('voice-record');
        const stopBtn = document.getElementById('voice-stop');
        const nextBtn = document.getElementById('voice-next');

        if (existing && existing.url) {
            playback.src = existing.url;
            playback.hidden = false;
            statusEl.textContent = `Recorded (${existing.durationSec}s)`;
            statusEl.className = 'voice-status done';
        }

        recordBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                const startTime = Date.now();

                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    const durationSec = Math.round((Date.now() - startTime) / 1000);
                    state.voice.recordings[voiceRound] = {
                        prompt: voiceRound + 1,
                        type: promptItem.type,
                        text: prompt,
                        durationSec,
                        url,
                        completed: durationSec >= promptItem.minDuration
                    };
                    playback.src = url;
                    playback.hidden = false;
                    statusEl.textContent = `Recorded (${durationSec}s)`;
                    statusEl.className = 'voice-status done';
                    nextBtn.disabled = false;
                    stream.getTracks().forEach(t => t.stop());
                };

                mediaRecorder.start();
                statusEl.textContent = 'Recording...';
                statusEl.className = 'voice-status recording';
                recordBtn.disabled = true;
                stopBtn.disabled = false;
            } catch {
                statusEl.textContent = 'Microphone access denied';
                statusEl.className = 'voice-status';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                recordBtn.disabled = false;
                stopBtn.disabled = true;
            }
        });

        nextBtn.addEventListener('click', () => {
            if (!state.voice.recordings[voiceRound]) return;
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
        else if (section.id === 'typing') renderTyping();
        else if (section.id === 'voice') { voiceRound = 0; renderVoice(); }
        startTimers(section.minutes);
    }

    function goNextSection(force) {
        if (sessionEnded || isSubmitting) return;
        if (!force && sectionIndex >= data.sections.length - 1) return;
        clearInterval(sectionTimer);

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
        if (sectionId === 'typing') return Math.min(100, Math.round((state.typing.bestWpm / 60) * 100));
        if (sectionId === 'voice') {
            const completedVoice = state.voice.recordings.filter(r => r && r.completed).length;
            state.voice.completionPercent = Math.round((completedVoice / data.voicePrompts.length) * 100);
            return state.voice.completionPercent;
        }
        return 0;
    }

    function computeOverall() {
        finalizeEnglishScores();
        finalizeReadingScores();
        finalizeWorkplaceScores();
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
        } else if (currentSection?.id === 'typing') {
            saveTypingProgress();
        }

        const overallScore = computeOverall();
        const durationMinutes = Math.round((Date.now() - startedAt) / 60000);

        const payload = {
            ...session,
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
                prompts: state.voice.recordings.map(r => ({
                    prompt: r.prompt,
                    type: r.type,
                    text: r.text,
                    durationSec: r.durationSec,
                    completed: r.completed
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
        startedAt = Date.now();
        globalSecondsLeft = data.totalMinutes * 60;
        updateTimers();
        initTabDetection();
        renderSection();
    }

    document.addEventListener('DOMContentLoaded', init);
})();