/**
 * Odd Man Out (shape aptitude) + Customer Response scenarios.
 * Loaded before assessment-data files; attached onto each attempt dataset.
 */
(function () {
    'use strict';

    // Shape codes: c circle, s square, t triangle, d diamond, h hexagon, p pentagon, r ring, w star, m semicircle
    // f = fill color, o = outline only (1), rot = rotation degrees, sz = scale 0.7–1.1
    function q(answer, shapes) {
        return { answer, shapes };
    }
    function sh(t, f, o, rot, sz) {
        return { t: t, f: f || '#2563eb', o: o ? 1 : 0, rot: rot || 0, sz: sz || 1 };
    }

    const BLUE = '#2563eb';
    const NAVY = '#0f172a';
    const GREEN = '#059669';
    const CORAL = '#e11d48';
    const VIOLET = '#7c3aed';
    const AMBER = '#d97706';

    window.ASSESSMENT_ODD_MAN_OUT_1 = [
        q(2, [sh('c', BLUE), sh('c', BLUE), sh('s', BLUE), sh('c', BLUE)]),
        q(1, [sh('t', GREEN), sh('c', GREEN), sh('t', GREEN), sh('t', GREEN)]),
        q(3, [sh('s', CORAL), sh('s', CORAL), sh('s', CORAL), sh('d', CORAL)]),
        q(0, [sh('h', VIOLET), sh('c', VIOLET), sh('c', VIOLET), sh('c', VIOLET)]),
        q(2, [sh('c', BLUE, 1), sh('c', BLUE, 1), sh('c', BLUE, 0), sh('c', BLUE, 1)]),
        q(1, [sh('t', NAVY), sh('t', NAVY, 0, 180), sh('t', NAVY), sh('t', NAVY)]),
        q(3, [sh('s', AMBER), sh('s', AMBER), sh('s', AMBER), sh('s', AMBER, 0, 0, 0.7)]),
        q(0, [sh('d', GREEN), sh('s', GREEN), sh('s', GREEN), sh('s', GREEN)]),
        q(2, [sh('c', CORAL), sh('c', CORAL), sh('r', CORAL), sh('c', CORAL)]),
        q(1, [sh('p', BLUE), sh('h', BLUE), sh('p', BLUE), sh('p', BLUE)]),
        q(3, [sh('t', VIOLET), sh('t', VIOLET), sh('t', VIOLET), sh('w', VIOLET)]),
        q(0, [sh('m', NAVY), sh('c', NAVY), sh('c', NAVY), sh('c', NAVY)]),
        q(2, [sh('s', GREEN, 1), sh('s', GREEN, 1), sh('s', GREEN, 0), sh('s', GREEN, 1)]),
        q(1, [sh('c', AMBER), sh('c', CORAL), sh('c', AMBER), sh('c', AMBER)]),
        q(3, [sh('d', BLUE), sh('d', BLUE), sh('d', BLUE), sh('t', BLUE)]),
        q(0, [sh('h', CORAL, 0, 30), sh('h', CORAL), sh('h', CORAL), sh('h', CORAL)]),
        q(2, [sh('w', VIOLET), sh('w', VIOLET), sh('p', VIOLET), sh('w', VIOLET)]),
        q(1, [sh('r', GREEN), sh('c', GREEN), sh('r', GREEN), sh('r', GREEN)]),
        q(3, [sh('s', NAVY), sh('s', NAVY), sh('s', NAVY), sh('s', NAVY, 0, 45)]),
        q(0, [sh('t', AMBER, 0, 0, 1.1), sh('t', AMBER), sh('t', AMBER), sh('t', AMBER)]),
        q(2, [sh('c', BLUE), sh('c', BLUE), sh('m', BLUE), sh('c', BLUE)]),
        q(1, [sh('d', CORAL, 1), sh('d', CORAL, 0), sh('d', CORAL, 1), sh('d', CORAL, 1)]),
        q(3, [sh('p', GREEN), sh('p', GREEN), sh('p', GREEN), sh('h', GREEN)]),
        q(0, [sh('s', VIOLET), sh('c', VIOLET), sh('c', VIOLET), sh('c', VIOLET)]),
        q(2, [sh('t', NAVY), sh('t', NAVY), sh('s', NAVY), sh('t', NAVY)])
    ];

    window.ASSESSMENT_ODD_MAN_OUT_2 = [
        q(1, [sh('h', BLUE, 1), sh('h', BLUE, 0), sh('h', BLUE, 1), sh('h', BLUE, 1)]),
        q(3, [sh('w', CORAL), sh('w', CORAL), sh('w', CORAL), sh('p', CORAL)]),
        q(0, [sh('t', GREEN, 0, 90), sh('t', GREEN), sh('t', GREEN), sh('t', GREEN)]),
        q(2, [sh('d', VIOLET), sh('d', VIOLET), sh('s', VIOLET, 0, 45), sh('d', VIOLET)]),
        q(1, [sh('c', AMBER, 0, 0, 0.75), sh('c', AMBER, 0, 0, 1.05), sh('c', AMBER, 0, 0, 0.75), sh('c', AMBER, 0, 0, 0.75)]),
        q(3, [sh('m', NAVY), sh('m', NAVY), sh('m', NAVY), sh('c', NAVY)]),
        q(0, [sh('r', BLUE), sh('r', GREEN), sh('r', BLUE), sh('r', BLUE)]),
        q(2, [sh('p', CORAL, 1), sh('p', CORAL, 1), sh('p', CORAL, 0), sh('p', CORAL, 1)]),
        q(1, [sh('s', VIOLET, 0, 0), sh('s', VIOLET, 0, 15), sh('s', VIOLET, 0, 0), sh('s', VIOLET, 0, 0)]),
        q(3, [sh('h', AMBER), sh('h', AMBER), sh('h', AMBER), sh('w', AMBER)]),
        q(0, [sh('c', GREEN, 1), sh('c', GREEN, 0), sh('c', GREEN, 0), sh('c', GREEN, 0)]),
        q(2, [sh('t', BLUE), sh('t', BLUE), sh('d', BLUE), sh('t', BLUE)]),
        q(1, [sh('s', CORAL), sh('h', CORAL), sh('s', CORAL), sh('s', CORAL)]),
        q(3, [sh('d', NAVY, 1), sh('d', NAVY, 1), sh('d', NAVY, 1), sh('d', NAVY, 0)]),
        q(0, [sh('w', GREEN, 0, 20), sh('w', GREEN), sh('w', GREEN), sh('w', GREEN)]),
        q(2, [sh('m', VIOLET, 0, 0), sh('m', VIOLET, 0, 0), sh('m', VIOLET, 0, 180), sh('m', VIOLET, 0, 0)]),
        q(1, [sh('p', AMBER), sh('p', BLUE), sh('p', AMBER), sh('p', AMBER)]),
        q(3, [sh('c', CORAL), sh('c', CORAL), sh('c', CORAL), sh('r', CORAL)]),
        q(0, [sh('s', BLUE, 0, 0, 1.1), sh('s', BLUE), sh('s', BLUE), sh('s', BLUE)]),
        q(2, [sh('h', NAVY), sh('h', NAVY), sh('p', NAVY), sh('h', NAVY)]),
        q(1, [sh('t', VIOLET, 1), sh('t', VIOLET, 0), sh('t', VIOLET, 1), sh('t', VIOLET, 1)]),
        q(3, [sh('d', GREEN), sh('d', GREEN), sh('d', GREEN), sh('c', GREEN)]),
        q(0, [sh('r', AMBER, 0, 0, 1.1), sh('r', AMBER), sh('r', AMBER), sh('r', AMBER)]),
        q(2, [sh('w', BLUE), sh('w', BLUE), sh('h', BLUE), sh('w', BLUE)]),
        q(1, [sh('m', CORAL), sh('s', CORAL), sh('m', CORAL), sh('m', CORAL)])
    ];

    window.ASSESSMENT_SCENARIOS_1 = [
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

    window.ASSESSMENT_SCENARIOS_2 = [
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

    function attachAptitude(target, oddMan, scenarios) {
        if (!target) return;
        target.oddManOutQuestions = oddMan;
        target.responseScenarios = scenarios;
        const sections = target.sections || [];
        const hasOdd = sections.some(s => s.id === 'oddman');
        if (!hasOdd) {
            target.sections = [
                { id: 'oddman', label: 'Odd Man Out', minutes: 7, weight: 0.10 },
                { id: 'scenarios', label: 'Customer Response', minutes: 12, weight: 0.12 },
                ...sections
            ];
        }
        // Rebalance weights if we appended and old weights still sum ~1
        const list = target.sections;
        if (list.length >= 8) {
            const map = {
                oddman: { minutes: 7, weight: 0.10 },
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
                return m ? { ...s, minutes: m.minutes, weight: m.weight } : s;
            });
            target.totalMinutes = 75;
        }
    }

    window.__attachAssessmentAptitude = function () {
        attachAptitude(window.ASSESSMENT_DATA, window.ASSESSMENT_ODD_MAN_OUT_1, window.ASSESSMENT_SCENARIOS_1);
        attachAptitude(window.ASSESSMENT_DATA_ATTEMPT2, window.ASSESSMENT_ODD_MAN_OUT_2, window.ASSESSMENT_SCENARIOS_2);
    };
})();
