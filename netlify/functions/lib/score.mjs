import { ANSWER_KEYS, SECTION_WEIGHTS } from './answer-keys.mjs';

function asArray(v) {
    return Array.isArray(v) ? v : [];
}

function scoreMcq(answers, key) {
    const keys = asArray(key);
    if (!keys.length) return null;
    let score = 0;
    const n = keys.length;
    for (let i = 0; i < n; i++) {
        const a = answers[i];
        if (a === null || a === undefined || a === '') continue;
        if (Number(a) === Number(keys[i])) score += 1;
    }
    return {
        score,
        total: n,
        percent: Math.round((score / n) * 100)
    };
}

function scoreFill(answers, keyLists) {
    const keys = asArray(keyLists);
    if (!keys.length) return null;
    let score = 0;
    const n = keys.length;
    for (let i = 0; i < n; i++) {
        const raw = String(answers[i] ?? '').trim().toLowerCase();
        if (!raw) continue;
        const accepted = asArray(keys[i]).map(x => String(x).toLowerCase());
        if (accepted.some(a => a === raw || raw.includes(a) || a.includes(raw))) {
            score += 1;
        }
    }
    return {
        score,
        total: n,
        percent: Math.round((score / n) * 100)
    };
}

function clampPct(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(100, Math.round(x)));
}

/**
 * Re-score objective sections from raw answers. Subjective sections (email/typing/voice)
 * keep client-provided metrics but are clamped. overallScore is recomputed from weights.
 */
export function serverScoreSubmission(body, attemptNumber = 1) {
    const keys = ANSWER_KEYS[Number(attemptNumber) === 2 ? 2 : 1] || ANSWER_KEYS[1];
    const grammarIn = body.grammar || {};
    const fillIn = body.fillBlank || {};
    const readingIn = body.reading || {};
    const workplaceIn = body.workplace || {};
    const emailWriting = body.emailWriting || body.emailAssessment || {};
    const typing = body.typing || {};
    const voice = body.voice || {};
    const oddman = body.oddman || {};
    const scenarios = body.scenarios || {};

    const grammar = scoreMcq(asArray(grammarIn.answers), keys.grammar) || {
        score: Number(grammarIn.score) || 0,
        total: asArray(keys.grammar).length || 0,
        percent: clampPct(grammarIn.percent)
    };
    grammar.answers = asArray(grammarIn.answers);

    const fillBlank = scoreFill(asArray(fillIn.answers), keys.fillBlank) || {
        score: Number(fillIn.score) || 0,
        total: asArray(keys.fillBlank).length || 0,
        percent: clampPct(fillIn.percent)
    };
    fillBlank.answers = asArray(fillIn.answers);

    const reading = scoreMcq(asArray(readingIn.answers), keys.reading) || {
        score: Number(readingIn.score) || 0,
        total: asArray(keys.reading).length || 0,
        percent: clampPct(readingIn.percent)
    };
    reading.answers = asArray(readingIn.answers);

    const workplace = scoreMcq(asArray(workplaceIn.answers), keys.workplace) || {
        score: Number(workplaceIn.score) || 0,
        total: asArray(keys.workplace).length || 0,
        percent: clampPct(workplaceIn.percent)
    };
    workplace.answers = asArray(workplaceIn.answers);

    const englishPercent = Math.round((clampPct(grammar.percent) + clampPct(fillBlank.percent)) / 2);

    const emailPct = clampPct(emailWriting.percent);
    const typingWpm = Number(typing.bestWpm) || 0;
    const typingAcc = clampPct(typing.bestAccuracy);
    // Typing section percent heuristic for overall (WPM capped + accuracy)
    const typingPct = clampPct(Math.min(100, (typingWpm / 45) * 70 + (typingAcc / 100) * 30));
    const voicePct = clampPct(voice.completionPercent ?? voice.percent);

    // Optional aptitude sections if present
    const oddmanPct = clampPct(oddman.percent);
    const scenariosPct = clampPct(scenarios.percent);

    const w = SECTION_WEIGHTS;
    let overallScore;
    if (oddman.percent != null || scenarios.percent != null) {
        // Weighted blend when aptitude sections exist (mirrors common client weights)
        overallScore = Math.round(
            oddmanPct * 0.1 +
            scenariosPct * 0.1 +
            englishPercent * 0.12 +
            reading.percent * 0.08 +
            workplace.percent * 0.12 +
            emailPct * 0.12 +
            typingPct * 0.12 +
            voicePct * 0.24
        );
    } else {
        overallScore = Math.round(
            englishPercent * (w.grammar) + // english uses grammar weight slot partly
            reading.percent * w.reading +
            workplace.percent * w.workplace +
            emailPct * w.email +
            typingPct * w.typing +
            voicePct * w.voice
        );
        // Recompute english as grammar+fill share of english weight
        overallScore = Math.round(
            grammar.percent * (w.grammar * 0.7) +
            fillBlank.percent * (w.grammar * 0.3) +
            reading.percent * w.reading +
            workplace.percent * w.workplace +
            emailPct * w.email +
            typingPct * w.typing +
            voicePct * w.voice
        );
    }

    return {
        grammar,
        fillBlank,
        englishPercent,
        reading,
        workplace,
        emailWriting: {
            ...emailWriting,
            percent: emailPct,
            serverReviewed: false
        },
        typing: {
            ...typing,
            bestWpm: typingWpm,
            bestAccuracy: typingAcc,
            sectionPercent: typingPct
        },
        voice: {
            ...voice,
            completionPercent: voicePct
        },
        oddman: {
            ...oddman,
            percent: oddmanPct
        },
        scenarios: {
            ...scenarios,
            percent: scenariosPct
        },
        overallScore: clampPct(overallScore),
        serverScored: true,
        scoredAt: new Date().toISOString()
    };
}
