/**
 * Logical Reasoning (shape aptitude) + Customer Response scenarios.
 * Black & white figures; scenario response order is shuffled so Best is not always first.
 */
(function () {
    'use strict';

    // Shape types: c circle, s square, t triangle, d diamond, h hex, p pentagon, r ring, w star, m semicircle
    // Lines: lh horizontal, lv vertical, ld diagonal \, ldd diagonal /, lx cross, lpar two H lines, lparv two V lines, l3 three H lines
    // Multi: 2c two circles, cs circle in square, 3d three dots, grid 4 small squares
    // f: #111 black fill, #fff white fill; o:1 outline only (black stroke)
    function sh(t, f, o, rot, sz) {
        return { t: t, f: f || '#111111', o: o ? 1 : 0, rot: rot || 0, sz: sz || 1 };
    }
    /** Pattern: complete the series (series → ?, pick from options). */
    function p(answer, series, options) {
        return { mode: 'pattern', answer, series, options };
    }
    /** Classic odd-one-out among 4 figures. */
    function o(answer, shapes) {
        return { mode: 'odd', answer, shapes };
    }

    const BK = '#111111';
    const WH = '#ffffff';

    /* Attempt 1 — complex B&W patterns + mixed odd-one-out */
    window.ASSESSMENT_ODD_MAN_OUT_1 = [
        p(1, [sh('c', BK), sh('c', BK), sh('c', BK)], [sh('s', BK), sh('c', BK), sh('t', BK), sh('d', BK)]),
        p(2, [sh('lh', BK), sh('lpar', BK), sh('l3', BK)], [sh('lv', BK), sh('lx', BK), sh('lpar', BK), sh('c', BK)]),
        p(0, [sh('s', BK), sh('s', BK, 0, 45), sh('s', BK)], [sh('s', BK, 0, 45), sh('s', BK), sh('c', BK), sh('d', BK)]),
        p(3, [sh('c', BK, 1), sh('c', BK, 0), sh('c', BK, 1)], [sh('c', BK, 1), sh('s', BK, 1), sh('c', BK, 0), sh('c', BK, 0)]),
        p(1, [sh('t', BK), sh('t', BK, 0, 180), sh('t', BK)], [sh('t', BK), sh('t', BK, 0, 180), sh('s', BK), sh('d', BK)]),
        p(2, [sh('lv', BK), sh('lh', BK), sh('lv', BK)], [sh('lv', BK), sh('ld', BK), sh('lh', BK), sh('lx', BK)]),
        p(0, [sh('1d', BK), sh('2c', BK), sh('3d', BK)], [sh('grid', BK), sh('3d', BK), sh('c', BK), sh('cs', BK)]),
        p(3, [sh('r', BK), sh('c', BK), sh('r', BK)], [sh('r', BK), sh('s', BK), sh('c', BK), sh('c', BK)]),
        p(1, [sh('ld', BK), sh('ldd', BK), sh('ld', BK)], [sh('ld', BK), sh('ldd', BK), sh('lh', BK), sh('lx', BK)]),
        p(2, [sh('cs', BK), sh('s', BK), sh('cs', BK)], [sh('cs', BK), sh('2c', BK), sh('s', BK), sh('c', BK)]),
        p(0, [sh('s', BK), sh('d', BK), sh('s', BK)], [sh('d', BK), sh('s', BK), sh('c', BK), sh('t', BK)]),
        p(3, [sh('lpar', BK), sh('lparv', BK), sh('lpar', BK)], [sh('l3', BK), sh('lh', BK), sh('lpar', BK), sh('lparv', BK)]),
        o(2, [sh('c', BK), sh('c', BK), sh('s', BK), sh('c', BK)]),
        p(1, [sh('m', BK), sh('m', BK, 0, 180), sh('m', BK)], [sh('m', BK), sh('m', BK, 0, 180), sh('c', BK), sh('s', BK)]),
        p(2, [sh('w', BK), sh('p', BK), sh('w', BK)], [sh('w', BK), sh('h', BK), sh('p', BK), sh('d', BK)]),
        p(0, [sh('grid', BK), sh('cs', BK), sh('grid', BK)], [sh('cs', BK), sh('grid', BK), sh('s', BK), sh('3d', BK)]),
        p(3, [sh('t', BK), sh('s', BK), sh('t', BK)], [sh('t', BK), sh('c', BK), sh('d', BK), sh('s', BK)]),
        p(1, [sh('lx', BK), sh('ld', BK), sh('lx', BK)], [sh('lx', BK), sh('ld', BK), sh('lh', BK), sh('lv', BK)]),
        o(1, [sh('lpar', BK), sh('lparv', BK), sh('lpar', BK), sh('lpar', BK)]),
        p(2, [sh('c', BK, 0, 0, 0.7), sh('c', BK), sh('c', BK, 0, 0, 1.1)], [sh('c', BK), sh('s', BK), sh('c', BK, 0, 0, 1.3), sh('r', BK)]),
        p(0, [sh('h', BK), sh('p', BK), sh('h', BK)], [sh('p', BK), sh('h', BK), sh('w', BK), sh('d', BK)]),
        p(3, [sh('2c', BK), sh('3d', BK), sh('2c', BK)], [sh('2c', BK), sh('c', BK), sh('cs', BK), sh('3d', BK)]),
        p(1, [sh('s', BK, 1), sh('s', BK, 0), sh('s', BK, 1)], [sh('s', BK, 1), sh('s', BK, 0), sh('c', BK, 0), sh('c', BK, 1)]),
        p(2, [sh('lv', BK), sh('lparv', BK), sh('l3', BK)], [sh('lh', BK), sh('lpar', BK), sh('l3', BK), sh('lx', BK)]),
        o(0, [sh('lx', BK), sh('lh', BK), sh('lh', BK), sh('lh', BK)])
    ];

    /* Attempt 2 — harder pattern set */
    window.ASSESSMENT_ODD_MAN_OUT_2 = [
        p(2, [sh('c', BK, 1), sh('r', BK), sh('c', BK, 1)], [sh('c', BK, 1), sh('s', BK, 1), sh('r', BK), sh('c', BK, 0)]),
        p(0, [sh('t', BK), sh('t', BK, 0, 90), sh('t', BK, 0, 180)], [sh('t', BK, 0, 270), sh('t', BK), sh('s', BK), sh('d', BK)]),
        p(3, [sh('lh', BK), sh('lpar', BK), sh('l3', BK)], [sh('lv', BK), sh('lparv', BK), sh('lx', BK), sh('lpar', BK)]),
        p(1, [sh('s', BK), sh('d', BK), sh('s', BK, 0, 45)], [sh('d', BK), sh('d', BK, 0, 45), sh('s', BK), sh('c', BK)]),
        p(2, [sh('1d', BK), sh('2c', BK), sh('3d', BK)], [sh('c', BK), sh('2c', BK), sh('grid', BK), sh('3d', BK)]),
        p(0, [sh('ld', BK), sh('lx', BK), sh('ldd', BK)], [sh('lx', BK), sh('ld', BK), sh('lh', BK), sh('lv', BK)]),
        p(3, [sh('cs', BK), sh('grid', BK), sh('cs', BK)], [sh('cs', BK), sh('s', BK), sh('2c', BK), sh('grid', BK)]),
        p(1, [sh('m', BK), sh('c', BK), sh('m', BK, 0, 180)], [sh('m', BK), sh('c', BK), sh('m', BK, 0, 180), sh('s', BK)]),
        o(2, [sh('h', BK, 1), sh('h', BK, 1), sh('h', BK, 0), sh('h', BK, 1)]),
        p(2, [sh('w', BK), sh('h', BK), sh('p', BK)], [sh('d', BK), sh('w', BK), sh('c', BK), sh('s', BK)]),
        p(0, [sh('lparv', BK), sh('lpar', BK), sh('lparv', BK)], [sh('lpar', BK), sh('lparv', BK), sh('l3', BK), sh('lh', BK)]),
        p(3, [sh('c', BK, 0, 0, 0.7), sh('c', BK), sh('c', BK, 0, 0, 1.15)], [sh('c', BK), sh('r', BK), sh('s', BK), sh('c', BK, 0, 0, 1.35)]),
        p(1, [sh('s', BK, 1), sh('c', BK, 1), sh('s', BK, 1)], [sh('s', BK, 1), sh('c', BK, 1), sh('s', BK, 0), sh('d', BK, 1)]),
        p(2, [sh('2c', BK), sh('cs', BK), sh('2c', BK)], [sh('2c', BK), sh('3d', BK), sh('cs', BK), sh('c', BK)]),
        o(1, [sh('3d', BK), sh('grid', BK), sh('3d', BK), sh('3d', BK)]),
        p(0, [sh('t', BK), sh('s', BK), sh('d', BK)], [sh('c', BK), sh('t', BK), sh('h', BK), sh('w', BK)]),
        p(3, [sh('lv', BK), sh('lh', BK), sh('ld', BK)], [sh('ldd', BK), sh('lx', BK), sh('lpar', BK), sh('ldd', BK)]),
        p(1, [sh('r', BK), sh('c', BK, 0), sh('r', BK)], [sh('r', BK), sh('c', BK, 0), sh('c', BK, 1), sh('s', BK)]),
        p(2, [sh('grid', BK), sh('3d', BK), sh('grid', BK)], [sh('grid', BK), sh('cs', BK), sh('3d', BK), sh('2c', BK)]),
        p(0, [sh('d', BK), sh('d', BK, 0, 45), sh('d', BK)], [sh('d', BK, 0, 45), sh('d', BK), sh('s', BK), sh('p', BK)]),
        o(3, [sh('s', BK, 0, 0), sh('s', BK, 0, 0), sh('s', BK, 0, 0), sh('s', BK, 0, 45)]),
        p(1, [sh('l3', BK), sh('lpar', BK), sh('lh', BK)], [sh('lv', BK), sh('c', BK), sh('l3', BK), sh('lx', BK)]),
        p(2, [sh('p', BK), sh('h', BK), sh('w', BK)], [sh('d', BK), sh('p', BK), sh('c', BK), sh('s', BK)]),
        p(0, [sh('cs', BK, 1), sh('cs', BK, 0), sh('cs', BK, 1)], [sh('cs', BK, 0), sh('cs', BK, 1), sh('s', BK, 0), sh('c', BK, 0)]),
        p(3, [sh('lx', BK), sh('ld', BK), sh('ldd', BK)], [sh('lh', BK), sh('lv', BK), sh('lpar', BK), sh('lx', BK)])
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
