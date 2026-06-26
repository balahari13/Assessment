(function () {
    'use strict';

    const SESSION_KEY = 'trinitas_assessment_session';
    const data = window.ASSESSMENT_DATA;

    let session = null;
    let sectionIndex = 0;
    let globalTimer = null;
    let sectionTimer = null;
    let globalSecondsLeft = data.totalMinutes * 60;
    let sectionSecondsLeft = 0;
    let startedAt = Date.now();

    const state = {
        grammar: { answers: [], score: 0, percent: 0 },
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
            if (globalSecondsLeft <= 0) finishAssessment(true);
        }, 1000);

        sectionTimer = setInterval(() => {
            sectionSecondsLeft -= 1;
            updateTimers();
            if (sectionSecondsLeft <= 0) goNextSection(true);
        }, 1000);
    }

    function updateProgress() {
        const fill = document.getElementById('progress-fill');
        const label = document.getElementById('progress-label');
        const pct = Math.round(((sectionIndex) / data.sections.length) * 100);
        if (fill) fill.style.width = `${pct}%`;
        if (label) label.textContent = `Section ${sectionIndex + 1} of ${data.sections.length}`;
    }

    function renderGrammar() {
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        panel.innerHTML = `
            <div class="section-intro">
                <h2>Basic Grammar Assessment</h2>
                <p class="section-desc">Answer all ${data.grammarQuestions.length} questions. You have ${section.minutes} minutes for this section.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(section.minutes * 60)}</span></span>
            </div>
            <form id="grammar-form">
                ${data.grammarQuestions.map((item, i) => `
                    <fieldset class="grammar-q">
                        <legend>${i + 1}. ${item.q}</legend>
                        <div class="grammar-options">
                            ${item.options.map((opt, j) => `
                                <label>
                                    <input type="radio" name="q${i}" value="${j}" required>
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </fieldset>
                `).join('')}
            </form>
            <div class="assessment-actions">
                <span></span>
                <button type="button" class="btn btn-primary" id="grammar-next">Continue to Typing</button>
            </div>
        `;

        document.getElementById('grammar-next').addEventListener('click', () => {
            const form = document.getElementById('grammar-form');
            if (!form.reportValidity()) return;
            let score = 0;
            const answers = [];
            data.grammarQuestions.forEach((item, i) => {
                const val = parseInt(form[`q${i}`].value, 10);
                answers.push(val);
                if (val === item.answer) score += 1;
            });
            state.grammar.answers = answers;
            state.grammar.score = score;
            state.grammar.percent = Math.round((score / data.grammarQuestions.length) * 100);
            goNextSection();
        });
    }

    let typingRound = 0;
    let typingStart = null;

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
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const passage = data.typingPassages[typingRound];
        const roundLabel = `Passage ${typingRound + 1} of ${data.typingPassages.length}`;

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Typing Speed Assessment</h2>
                <p class="section-desc">${roundLabel}. Type the passage below as accurately as possible. Section limit: ${section.minutes} minutes total.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft)}</span></span>
            </div>
            <div class="typing-display" id="typing-display"></div>
            <textarea class="typing-input" id="typing-input" placeholder="Start typing here..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
            <div class="typing-stats">
                <span>WPM: <strong id="stat-wpm">0</strong></span>
                <span>Accuracy: <strong id="stat-accuracy">0%</strong></span>
                <span>Round: <strong>${roundLabel}</strong></span>
            </div>
            <div class="assessment-actions">
                <button type="button" class="btn btn-secondary" id="typing-skip" ${typingRound >= data.typingPassages.length - 1 ? 'hidden' : ''}>Next Passage</button>
                <button type="button" class="btn btn-primary" id="typing-next">${typingRound >= data.typingPassages.length - 1 ? 'Continue to Voice' : 'Complete Passage'}</button>
            </div>
        `;

        const input = document.getElementById('typing-input');
        const display = document.getElementById('typing-display');
        typingStart = Date.now();
        input.focus();

        function onInput() {
            const typed = input.value;
            display.innerHTML = renderTypingDisplay(passage, typed);
            const stats = calcTypingStats(passage, typed, (Date.now() - typingStart) / 1000);
            document.getElementById('stat-wpm').textContent = stats.wpm;
            document.getElementById('stat-accuracy').textContent = `${stats.accuracy}%`;
        }

        input.addEventListener('input', onInput);
        display.innerHTML = renderTypingDisplay(passage, '');

        function completeRound() {
            const typed = input.value;
            const stats = calcTypingStats(passage, typed, (Date.now() - typingStart) / 1000);
            state.typing.rounds.push({ passage: typingRound + 1, ...stats });
            state.typing.bestWpm = Math.max(state.typing.bestWpm, stats.wpm);
            state.typing.bestAccuracy = Math.max(state.typing.bestAccuracy, stats.accuracy);
            typingRound += 1;
            if (typingRound < data.typingPassages.length) {
                renderTyping();
            } else {
                goNextSection();
            }
        }

        document.getElementById('typing-next').addEventListener('click', completeRound);
        const skipBtn = document.getElementById('typing-skip');
        if (skipBtn) skipBtn.addEventListener('click', completeRound);
    }

    let voiceRound = 0;
    let mediaRecorder = null;
    let audioChunks = [];

    async function renderVoice() {
        const panel = document.getElementById('assessment-content');
        const section = data.sections[sectionIndex];
        const prompt = data.voicePrompts[voiceRound];
        const existing = state.voice.recordings[voiceRound];

        panel.innerHTML = `
            <div class="section-intro">
                <h2>Voice Assessment</h2>
                <p class="section-desc">Read the script clearly at a professional pace. Prompt ${voiceRound + 1} of ${data.voicePrompts.length}. Allow microphone access when prompted.</p>
                <span class="section-timer">Section time remaining: <span id="section-timer">${formatTime(sectionSecondsLeft)}</span></span>
            </div>
            <div class="voice-prompt-box">${prompt}</div>
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
                        durationSec,
                        url,
                        completed: durationSec >= 10
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
        else if (section.id === 'typing') { typingRound = 0; renderTyping(); }
        else if (section.id === 'voice') { voiceRound = 0; renderVoice(); }
        startTimers(section.minutes);
    }

    function goNextSection(force) {
        if (!force && sectionIndex >= data.sections.length - 1) return;
        clearInterval(sectionTimer);
        sectionIndex += 1;
        if (sectionIndex >= data.sections.length) {
            finishAssessment(force);
            return;
        }
        renderSection();
    }

    function computeOverall() {
        const g = state.grammar.percent || 0;
        const t = Math.min(100, Math.round((state.typing.bestWpm / 60) * 100));
        const completedVoice = state.voice.recordings.filter(r => r && r.completed).length;
        state.voice.completionPercent = Math.round((completedVoice / data.voicePrompts.length) * 100);
        const v = state.voice.completionPercent;
        return Math.round(g * 0.35 + t * 0.35 + v * 0.30);
    }

    async function finishAssessment(timedOut) {
        clearInterval(globalTimer);
        clearInterval(sectionTimer);

        const panel = document.getElementById('assessment-content');
        panel.innerHTML = `<p class="section-desc">Submitting your assessment...</p>`;

        const overallScore = computeOverall();
        const durationMinutes = Math.round((Date.now() - startedAt) / 60000);

        const payload = {
            ...session,
            durationMinutes,
            timedOut: !!timedOut,
            overallScore,
            grammar: state.grammar,
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
                    durationSec: r.durationSec,
                    completed: r.completed
                }))
            }
        };

        const { ok, data: res } = await window.TrinitasAPI.submitAssessment(payload);

        if (!ok) {
            panel.innerHTML = `
                <div class="form-alert form-alert--error" style="display:block">
                    <p>${res.message || 'Submission failed.'} Please contact <a href="mailto:info@trinitasnxt.in">info@trinitasnxt.in</a>.</p>
                </div>
                <button type="button" class="btn btn-primary" id="retry-submit" style="margin-top:1rem">Retry Submit</button>
            `;
            document.getElementById('retry-submit').addEventListener('click', () => finishAssessment(timedOut));
            return;
        }

        sessionStorage.removeItem(SESSION_KEY);
        const viaEmail = res.via === 'email';
        panel.innerHTML = `
            <div class="form-alert form-alert--success" style="display:block">
                <h2 style="margin-bottom:0.5rem">Assessment Submitted</h2>
                <p>Thank you, ${session.fullName}. Your preliminary assessment has been recorded. Our recruitment team will contact you if your profile matches current openings.</p>
                <p style="margin-top:0.75rem"><strong>Overall score:</strong> ${overallScore}%</p>
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
        renderSection();
    }

    document.addEventListener('DOMContentLoaded', init);
})();