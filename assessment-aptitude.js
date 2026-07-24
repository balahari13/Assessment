/**
 * Logical Reasoning — Odd Man Out (exam-style B&W figures) + Customer Response scenarios.
 * Scenario response order is shuffled so Best is not always first.
 */
(function () {
    'use strict';

    /**
     * Figure codes (black & white aptitude style):
     * Basic: c filled circle, r ring, s square, t triangle, d diamond, h hex
     * Dots: c1/c2/c3 circle+dots, s1/s2 square+dots
     * Divisions: ch/cv/cx circle+line(s), sd/sx square+diagonal(s)
     * Nested: ncs circle-in-square, nsc square-in-circle, nct triangle-in-circle, nrc concentric
     * Half: halfL/halfR half-filled circle, halfSq half square
     * Marks: plus, bars2/bars3, arrR/arrU, corner, pie
     * Lines: lh, lv, ld, ldd, lx, lpar, lparv
     */
    function f(t, rot) {
        return { t: t, rot: rot || 0 };
    }
    /** Odd man out: 4 figures, answer = index of the odd one (0–3). */
    function odd(answer, a, b, c, d) {
        return { mode: 'odd', answer, shapes: [a, b, c, d] };
    }

    /* Attempt 1 — classic odd man out (4 figures, find the different one) */
    window.ASSESSMENT_ODD_MAN_OUT_1 = [
        odd(2, f('c'), f('c'), f('s'), f('c')),
        odd(1, f('r'), f('c'), f('r'), f('r')),
        odd(3, f('t'), f('t'), f('t'), f('d')),
        odd(0, f('ch'), f('cv'), f('cv'), f('cv')),
        odd(2, f('c1'), f('c1'), f('c2'), f('c1')),
        odd(1, f('s'), f('s', 45), f('s'), f('s')),
        odd(3, f('ncs'), f('ncs'), f('ncs'), f('nsc')),
        odd(0, f('halfL'), f('halfR'), f('halfR'), f('halfR')),
        odd(2, f('bars2'), f('bars2'), f('bars3'), f('bars2')),
        odd(1, f('t'), f('t', 180), f('t'), f('t')),
        odd(3, f('cx'), f('cx'), f('cx'), f('ch')),
        odd(0, f('s1'), f('s2'), f('s2'), f('s2')),
        odd(2, f('nrc'), f('nrc'), f('r'), f('nrc')),
        odd(1, f('ld'), f('lh'), f('ld'), f('ld')),
        odd(3, f('plus'), f('plus'), f('plus'), f('lx')),
        odd(0, f('pie'), f('c'), f('c'), f('c')),
        odd(2, f('nct'), f('nct'), f('ncs'), f('nct')),
        odd(1, f('arrR'), f('arrU'), f('arrR'), f('arrR')),
        odd(3, f('halfSq'), f('halfSq'), f('halfSq'), f('s')),
        odd(0, f('h'), f('s'), f('s'), f('s')),
        odd(2, f('c3'), f('c3'), f('c1'), f('c3')),
        odd(1, f('sd'), f('sx'), f('sd'), f('sd')),
        odd(3, f('lpar'), f('lpar'), f('lpar'), f('lparv')),
        odd(0, f('corner'), f('s'), f('s'), f('s')),
        odd(2, f('d'), f('d'), f('s', 45), f('d'))
    ];

    /* Attempt 2 — harder odd man out */
    window.ASSESSMENT_ODD_MAN_OUT_2 = [
        odd(1, f('c2'), f('c3'), f('c2'), f('c2')),
        odd(3, f('nsc'), f('nsc'), f('nsc'), f('ncs')),
        odd(0, f('t', 90), f('t'), f('t'), f('t')),
        odd(2, f('halfL'), f('halfL'), f('halfR'), f('halfL')),
        odd(1, f('cx'), f('ch'), f('cx'), f('cx')),
        odd(3, f('bars3'), f('bars3'), f('bars3'), f('bars2')),
        odd(0, f('pie'), f('halfL'), f('halfL'), f('halfL')),
        odd(2, f('nrc'), f('nrc'), f('c'), f('nrc')),
        odd(1, f('s', 0), f('s', 45), f('s', 0), f('s', 0)),
        odd(3, f('arrU'), f('arrU'), f('arrU'), f('arrR')),
        odd(0, f('sd'), f('ch'), f('ch'), f('ch')),
        odd(2, f('c1'), f('c1'), f('s1'), f('c1')),
        odd(1, f('lparv'), f('lpar'), f('lparv'), f('lparv')),
        odd(3, f('nct'), f('nct'), f('nct'), f('nsc')),
        odd(0, f('corner'), f('s1'), f('s1'), f('s1')),
        odd(2, f('r'), f('r'), f('nrc'), f('r')),
        odd(1, f('d'), f('h'), f('d'), f('d')),
        odd(3, f('plus'), f('plus'), f('plus'), f('cx')),
        odd(0, f('halfSq'), f('halfL'), f('halfL'), f('halfL')),
        odd(2, f('t'), f('t'), f('t', 180), f('t')),
        odd(1, f('sx'), f('sd'), f('sx'), f('sx')),
        odd(3, f('c3'), f('c3'), f('c3'), f('c2')),
        odd(0, f('lx'), f('ld'), f('ld'), f('ld')),
        odd(2, f('ncs'), f('ncs'), f('s'), f('ncs')),
        odd(1, f('cv'), f('ch'), f('cv'), f('cv'))
    ];

    function rawScenarios1() {
        return [
            {
                title: 'Angry billing dispute',
                situation: 'A customer calls shouting that they were double-charged and threatens to post negative reviews if not refunded immediately. Your system shows only one successful charge so far.',
                responses: [
                    'Stay calm, acknowledge frustration, verify the account carefully, explain what you see, and outline next steps for a refund review if an error is confirmed.',
                    'Match their volume, insist they are wrong, and end the call if they continue shouting.',
                    'Promise a full refund immediately without verification to stop the shouting.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Hold time complaint',
                situation: 'After a long hold, the customer says: “I have been waiting forever. This company does not respect my time.”',
                responses: [
                    'Apologize for the wait, thank them for patience, and move efficiently to resolve the issue.',
                    'Ignore the hold comment and jump straight into policy questions only.',
                    'Tell them wait times are normal and they should call during off-peak hours next time.'
                ],
                best: 0, neutral: 1, worst: 2
            },
            {
                title: 'Cannot override policy',
                situation: 'A customer demands an exception your team is not authorized to grant. They say everyone else gets special treatment.',
                responses: [
                    'Explain the limitation clearly, show empathy, and offer the closest compliant alternative or proper escalation path.',
                    'Invent an exception so they leave happy, then leave a vague note.',
                    'Read the policy word-for-word with no empathy and refuse any alternative.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Sensitive data request',
                situation: 'A caller asks you to confirm another person’s full medical claim details without proper verification, saying they are family.',
                responses: [
                    'Refuse to share protected information, explain verification requirements, and offer a secure path if the caller is authorized.',
                    'Share limited details after they give a first name only.',
                    'Transfer them silently without explaining privacy rules.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Repeated follow-up',
                situation: 'The same customer has called three times this week about an open ticket. Today they say no one is helping them.',
                responses: [
                    'Own the case, review prior notes, set a clear update commitment, and document ownership so the loop closes.',
                    'Open a brand-new ticket without reading history to “start fresh.”',
                    'Tell them to stop calling and wait for email only.'
                ],
                best: 0, neutral: 1, worst: 2
            },
            {
                title: 'Confused elderly customer',
                situation: 'An older customer struggles with online steps and keeps repeating the same question slowly.',
                responses: [
                    'Slow your pace, use simple language, confirm understanding, and offer step-by-step help or a supported channel.',
                    'Speak faster to finish the call within AHT targets.',
                    'Ask them to have a younger relative call instead and hang up.'
                ],
                best: 0, neutral: 1, worst: 2
            },
            {
                title: 'Service outage',
                situation: 'Many customers are calling about a known system outage. This caller is scared their payment failed mid-process.',
                responses: [
                    'Acknowledge the outage transparently, reassure on payment status based on available data, and give the expected update window.',
                    'Deny any outage and blame the customer’s device only.',
                    'Say you have no information and offer no next step.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Abusive language',
                situation: 'The customer uses personal insults and refuses to stop after one warning. You still need to protect the account.',
                responses: [
                    'Issue a clear professional boundary, warn that abuse may end the call, offer to continue if respectful, and escalate per policy if it continues.',
                    'Insult them back to establish control.',
                    'Stay silent for two minutes hoping they hang up, without documenting.'
                ],
                best: 0, neutral: 2, worst: 1
            }
        ];
    }

    function rawScenarios2() {
        return [
            {
                title: 'SLA miss on VIP account',
                situation: 'A B2B healthcare client contact says your team missed a response SLA and their leadership is escalating. Notes show a delayed specialist queue.',
                responses: [
                    'Acknowledge the miss without excuses, summarize ownership and recovery plan, and commit to a precise next update time.',
                    'Argue that the client’s expectation was unrealistic and refuse to discuss recovery.',
                    'Apologize vaguely and promise “ASAP” with no owner or time.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Conflicting advice from prior agent',
                situation: 'The customer received incorrect guidance yesterday and now demands you honor that incorrect promise.',
                responses: [
                    'Apologize for the confusion, clarify the correct policy, and find the best compliant remedy without blaming the prior agent harshly to the customer.',
                    'Blame the previous agent by name and refuse any goodwill.',
                    'Honor the incorrect promise without logging risk or seeking approval when required.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Partial payment confusion',
                situation: 'A customer partially paid an invoice and believes the account should show fully clear. Collections language in their email felt threatening.',
                responses: [
                    'Validate concern, explain balance breakdown calmly, correct any notice if wrong, and set a clear payment or dispute path.',
                    'Threaten disconnection immediately without reviewing balances.',
                    'Only restate the total due with no breakdown.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Language and cultural friction',
                situation: 'A customer says your tone felt rude and that you “do not understand how things work in their region.”',
                responses: [
                    'Acknowledge perception, adjust phrasing, restate goals respectfully, and continue resolving the issue.',
                    'Insist your tone is always correct and they must adapt.',
                    'Transfer without context to avoid the conversation.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Unauthorized third-party pressure',
                situation: 'A consultant on the line demands account changes and says the patient authorized them verbally only.',
                responses: [
                    'Follow verification and authorization rules, decline unauthorized changes, and explain how proper authority can be established.',
                    'Process the change to avoid conflict.',
                    'Argue with the consultant personally about ethics without documenting.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Chat and call overlap',
                situation: 'The customer is on chat and voice simultaneously, receiving two different answers from different channels.',
                responses: [
                    'Pause conflicting actions, align on one channel of record, correct the answer, and document so both channels stay consistent.',
                    'Continue both threads independently to “be faster.”',
                    'Tell them to pick one channel and close the other without reconciling facts.'
                ],
                best: 0, neutral: 2, worst: 1
            },
            {
                title: 'Data correction under time pressure',
                situation: 'You notice a prior note may contain a wrong date of birth while the customer is rushing you to finish.',
                responses: [
                    'Stop to verify identity data carefully, correct documentation, then proceed — accuracy over speed for protected data.',
                    'Ignore the mismatch to save handle time.',
                    'Guess the correct DOB from memory of similar accounts.'
                ],
                best: 0, neutral: 1, worst: 2
            },
            {
                title: 'Supervisor demand mid-call',
                situation: 'A floor lead pings you to take a transfer while you are mid-sensitive verification with a crying customer.',
                responses: [
                    'Finish critical verification with care, briefly signal capacity to the lead via approved channel, and avoid abandoning the customer mid-process.',
                    'Drop the call immediately without explanation to take the transfer.',
                    'Argue with the lead on an open line while the customer listens.'
                ],
                best: 0, neutral: 1, worst: 2
            }
        ];
    }

    /** Shuffle response order so Best is not always option A; remap answer indices. */
    function shuffleScenarioResponses(scenarios, seedBase) {
        return scenarios.map((item, qi) => {
            const n = item.responses.length;
            const order = Array.from({ length: n }, (_, i) => i);
            let s = (seedBase + qi * 17 + item.title.length * 3) >>> 0;
            for (let i = n - 1; i > 0; i--) {
                s = (Math.imul(s, 1103515245) + 12345) >>> 0;
                const j = s % (i + 1);
                const tmp = order[i];
                order[i] = order[j];
                order[j] = tmp;
            }
            // order[newPos] = oldPos → map old -> new
            const oldToNew = {};
            order.forEach((oldIdx, newIdx) => { oldToNew[oldIdx] = newIdx; });
            return {
                title: item.title,
                situation: item.situation,
                responses: order.map(oldIdx => item.responses[oldIdx]),
                best: oldToNew[item.best],
                neutral: oldToNew[item.neutral],
                worst: oldToNew[item.worst]
            };
        });
    }

    function attachAptitude(target, oddMan, scenarios) {
        if (!target) return;
        target.oddManOutQuestions = oddMan;
        target.responseScenarios = scenarios;
        const sections = target.sections || [];
        const hasOdd = sections.some(s => s.id === 'oddman');
        if (!hasOdd) {
            target.sections = [
                { id: 'oddman', label: 'Logical Reasoning', minutes: 7, weight: 0.10 },
                { id: 'scenarios', label: 'Customer Response', minutes: 12, weight: 0.12 },
                ...sections
            ];
        } else {
            target.sections = sections.map(s =>
                s.id === 'oddman' ? { ...s, label: 'Logical Reasoning' } : s
            );
        }
        const list = target.sections;
        if (list.length >= 8) {
            const map = {
                oddman: { minutes: 7, weight: 0.10, label: 'Logical Reasoning' },
                scenarios: { minutes: 12, weight: 0.12 },
                grammar: { minutes: 12, weight: 0.12 },
                reading: { minutes: 7, weight: 0.07 },
                workplace: { minutes: 8, weight: 0.10 },
                email: { minutes: 10, weight: 0.12 },
                typing: { minutes: 3, weight: 0.12 },
                voice: { minutes: 12, weight: 0.25 }
            };
            target.sections = list.map(s => {
                const m = map[s.id];
                return m ? { ...s, minutes: m.minutes, weight: m.weight, label: m.label || s.label } : s;
            });
            target.totalMinutes = 75;
        }
    }

    window.__attachAssessmentAptitude = function () {
        attachAptitude(
            window.ASSESSMENT_DATA,
            window.ASSESSMENT_ODD_MAN_OUT_1,
            shuffleScenarioResponses(rawScenarios1(), 9041)
        );
        attachAptitude(
            window.ASSESSMENT_DATA_ATTEMPT2,
            window.ASSESSMENT_ODD_MAN_OUT_2,
            shuffleScenarioResponses(rawScenarios2(), 7723)
        );
    };
})();
