window.ASSESSMENT_DATA = {
    totalMinutes: 60,
    sections: [
        { id: 'grammar', label: 'Basic English', minutes: 20, weight: 0.18 },
        { id: 'reading', label: 'Reading Comprehension', minutes: 10, weight: 0.10 },
        { id: 'workplace', label: 'Workplace & Psychology', minutes: 15, weight: 0.22 },
        { id: 'typing', label: 'Typing Speed', minutes: 3, weight: 0.20 },
        { id: 'voice', label: 'Voice Assessment', minutes: 12, weight: 0.30 }
    ],
    grammarQuestions: [
        { q: 'What is the past tense of "go"?', options: ['goed', 'went', 'gone', 'going'], answer: 1 },
        { q: 'Choose the correct spelling.', options: ['recieve', 'receive', 'receve', 'receeve'], answer: 1 },
        { q: 'What is the opposite of "hot"?', options: ['warm', 'cold', 'cool', 'heat'], answer: 1 },
        { q: 'Which word is a noun?', options: ['run', 'quickly', 'table', 'happy'], answer: 2 },
        { q: 'Fill in the blank: I ate ___ apple.', options: ['a', 'an', 'the', 'no article'], answer: 1 },
        { q: 'What is the plural of "child"?', options: ['childs', 'childes', 'children', 'childrens'], answer: 2 },
        { q: 'Which word means the same as "happy"?', options: ['sad', 'angry', 'joyful', 'tired'], answer: 2 },
        { q: 'He ___ to work every day.', options: ['go', 'goes', 'going', 'gone'], answer: 1 },
        { q: 'Which sentence is correct?', options: ['She are my friend.', 'She is my friend.', 'She am my friend.', 'She be my friend.'], answer: 1 },
        { q: 'Which sentence uses capital letters correctly?', options: ['i live in india.', 'I live in india.', 'I live in India.', 'i Live In India.'], answer: 2 },
        { q: 'What is the opposite of "big"?', options: ['large', 'small', 'tall', 'wide'], answer: 1 },
        { q: 'Choose the correct word: ___ going to the store.', options: ['Their', 'There', "They're", 'They'], answer: 2 },
        { q: 'Which word is a verb?', options: ['beautiful', 'quickly', 'write', 'table'], answer: 2 },
        { q: 'She ___ cooking dinner right now.', options: ['is', 'are', 'am', 'be'], answer: 0 },
        { q: 'How many vowels are in the word "education"?', options: ['3', '4', '5', '6'], answer: 2 },
        { q: 'What is the past tense of "eat"?', options: ['eated', 'eaten', 'ate', 'eating'], answer: 2 },
        { q: 'Which sentence has correct punctuation?', options: ['what is your name', 'What is your name?', 'What is your name.', 'What is your name,'], answer: 1 },
        { q: 'Which word describes a noun?', options: ['run', 'beautiful', 'quickly', 'jump'], answer: 1 },
        { q: 'They ___ playing in the park.', options: ['is', 'am', 'are', 'was'], answer: 2 },
        { q: 'Choose the correct contraction: ___ raining outside.', options: ['Its', "It's", 'Its\'', 'It'], answer: 1 },
        { q: 'The book is ___ the table.', options: ['in', 'on', 'at', 'by'], answer: 1 },
        { q: 'What is the comparative form of "good"?', options: ['gooder', 'more good', 'better', 'best'], answer: 2 },
        { q: 'Which sentence is correct?', options: ["He don't like tea.", "He doesn't like tea.", "He doesn't likes tea.", "He don't likes tea."], answer: 1 },
        { q: 'What is the opposite of "early"?', options: ['soon', 'late', 'fast', 'quick'], answer: 1 },
        { q: 'Thank you ___ your help.', options: ['to', 'for', 'with', 'at'], answer: 1 }
    ],
    fillBlankQuestions: [
        { q: 'The sun rises in the _____.', answers: ['east'] },
        { q: 'Water freezes at _____ degrees Celsius.', answers: ['zero', '0'] },
        { q: 'A person who flies an airplane is called a _____.', answers: ['pilot'] },
        { q: 'The past tense of "write" is _____.', answers: ['wrote'] },
        { q: 'We use our _____ to hear sounds.', answers: ['ears'] },
        { q: 'Mumbai is a major city in _____.', answers: ['india'] },
        { q: 'The opposite of "expensive" is _____.', answers: ['cheap'] },
        { q: 'There are _____ days in a week.', answers: ['seven', '7'] },
        { q: 'She bought a _____ of bread from the store.', answers: ['loaf'] },
        { q: 'Please close the door _____ you leave.', answers: ['when', 'before'] }
    ],
    readingPassages: [
        {
            title: 'First-Day Orientation at a Contact Center',
            passage: 'On her first day at the contact center, Priya attended an orientation session that explained company policies, quality standards, and customer service expectations. The trainer emphasized that every call should begin with a polite greeting and end with a clear summary of the next steps. Agents were reminded that accuracy matters as much as speed, especially when recording customer details in the CRM system. Priya learned that supervisors review a sample of calls each week to provide coaching and identify areas for improvement. By the end of the session, she understood that professionalism and empathy are essential skills for every customer interaction.',
            questions: [
                {
                    q: 'What did the trainer say should happen at the beginning and end of every call?',
                    options: [
                        'Agents should transfer the call immediately',
                        'Calls should begin with a polite greeting and end with a clear summary of next steps',
                        'Agents should ask for payment before helping the customer',
                        'Calls should end without any follow-up information'
                    ],
                    answer: 1
                },
                {
                    q: 'According to the passage, what is reviewed each week?',
                    options: [
                        'Only emails sent by customers',
                        'The cafeteria menu',
                        'A sample of calls for coaching and improvement',
                        'Employee vacation requests'
                    ],
                    answer: 2
                },
                {
                    q: 'Which skills does the passage describe as essential for customer interactions?',
                    options: [
                        'Speed and silence',
                        'Professionalism and empathy',
                        'Humor and debate',
                        'Sales pressure and urgency'
                    ],
                    answer: 1
                }
            ]
        },
        {
            title: 'Handling a Billing Dispute on a Support Call',
            passage: 'During a busy evening shift, Ravi received a call from a customer who believed they had been charged twice for the same service. Instead of arguing, Ravi listened carefully and asked clarifying questions to understand the timeline of the charges. He placed the customer on a brief hold only after explaining why he needed to verify account details in the billing system. After reviewing the transaction history, Ravi confirmed that a duplicate charge had occurred and initiated a refund. He documented the case thoroughly and assured the customer that a confirmation email would arrive within twenty-four hours.',
            questions: [
                {
                    q: 'What was the customer\'s main concern in the passage?',
                    options: [
                        'They wanted to cancel their internet connection',
                        'They believed they had been charged twice for the same service',
                        'They could not log in to their account',
                        'They requested a product upgrade'
                    ],
                    answer: 1
                },
                {
                    q: 'What did Ravi do before placing the customer on hold?',
                    options: [
                        'He ended the call immediately',
                        'He transferred the call without explanation',
                        'He explained why he needed to verify account details',
                        'He asked the customer to call back later'
                    ],
                    answer: 2
                },
                {
                    q: 'What action did Ravi take after confirming the duplicate charge?',
                    options: [
                        'He ignored the issue and closed the ticket',
                        'He asked the customer to visit a physical store',
                        'He initiated a refund and documented the case',
                        'He increased the customer\'s monthly fee'
                    ],
                    answer: 2
                }
            ]
        }
    ],
    workplaceQuestions: [
        {
            q: 'A customer becomes angry during a call. What is the best first response?',
            options: [
                'Interrupt them and explain company policy immediately',
                'Stay calm, listen actively, and acknowledge their concern',
                'Transfer the call without saying anything',
                'Tell them to lower their voice or the call will end'
            ],
            answer: 1
        },
        {
            q: 'Why is confidentiality important in a BPO environment?',
            options: [
                'It allows agents to share customer data on social media',
                'It protects sensitive customer and company information',
                'It helps agents finish calls more quickly',
                'It is only required for managers, not agents'
            ],
            answer: 1
        },
        {
            q: 'You notice a teammate struggling with call volume during a peak hour. What should you do?',
            options: [
                'Ignore the situation and focus only on your own targets',
                'Offer appropriate support or inform the team lead if needed',
                'Publicly criticize their performance on the floor',
                'Take over their calls without informing anyone'
            ],
            answer: 1
        },
        {
            q: 'What does professionalism mean on a customer support call?',
            options: [
                'Using casual slang to sound friendly',
                'Speaking clearly, respectfully, and following company standards',
                'Ending calls as fast as possible regardless of resolution',
                'Sharing personal opinions about the customer'
            ],
            answer: 1
        },
        {
            q: 'An agent feels stressed after several difficult calls. Which action is most appropriate?',
            options: [
                'Continue working without any break until the shift ends',
                'Use approved stress-management techniques and take a short break if permitted',
                'Argue with the next customer to release frustration',
                'Leave the workplace without informing anyone'
            ],
            answer: 1
        },
        {
            q: 'You are unsure about the correct answer to a customer\'s question. What should you do?',
            options: [
                'Guess and provide whatever answer seems likely',
                'Tell the customer that the company does not support them',
                'Verify the information using approved resources or escalate appropriately',
                'End the call before they ask again'
            ],
            answer: 2
        },
        {
            q: 'Which behavior best supports effective teamwork?',
            options: [
                'Withholding helpful information from colleagues',
                'Communicating clearly and sharing relevant updates',
                'Competing by creating confusion during handovers',
                'Blaming others publicly for every mistake'
            ],
            answer: 1
        },
        {
            q: 'Why is punctuality important in a contact center role?',
            options: [
                'It has no impact on operations or customers',
                'It helps maintain coverage, service levels, and team reliability',
                'It is only important on the first day of employment',
                'It matters only if a supervisor is watching'
            ],
            answer: 1
        },
        {
            q: 'A customer asks you to make an exception to policy. What is the best approach?',
            options: [
                'Promise an exception without checking any rules',
                'Refuse immediately without explanation',
                'Review policy, explain options clearly, and escalate if required',
                'Tell the customer that policies do not apply to them'
            ],
            answer: 2
        },
        {
            q: 'What is the main purpose of active listening in customer service?',
            options: [
                'To prepare a reply before the customer finishes speaking',
                'To understand the customer\'s issue accurately before responding',
                'To reduce the number of words the customer uses',
                'To avoid documenting the issue'
            ],
            answer: 1
        },
        {
            q: 'You accidentally provided incorrect information to a customer. What should you do?',
            options: [
                'Hope the customer does not notice',
                'Correct the error as soon as possible and inform the appropriate person if needed',
                'Blame the customer for misunderstanding',
                'Delete the call record immediately'
            ],
            answer: 1
        },
        {
            q: 'Which action demonstrates accountability at work?',
            options: [
                'Denying mistakes even when evidence is clear',
                'Accepting responsibility and working to resolve issues',
                'Waiting for others to fix problems you caused',
                'Hiding errors from supervisors at all times'
            ],
            answer: 1
        },
        {
            q: 'Why should agents avoid using negative language with customers?',
            options: [
                'Negative language always leads to shorter calls',
                'It can increase frustration and reduce trust',
                'Customers prefer blunt and unfriendly responses',
                'Company policy requires agents to be argumentative'
            ],
            answer: 1
        },
        {
            q: 'A colleague asks for help during a handover. What is the most professional response?',
            options: [
                'Refuse because it is not your customer',
                'Review the handover notes and assist if you are able',
                'Complain that handovers waste your time',
                'Start the call over without reading any notes'
            ],
            answer: 1
        },
        {
            q: 'What is an appropriate way to manage time during a busy shift?',
            options: [
                'Skip documentation to save seconds on every call',
                'Prioritize tasks, follow process, and use tools efficiently',
                'Avoid breaks even when they are scheduled',
                'Multitask on personal browsing during live calls'
            ],
            answer: 1
        },
        {
            q: 'Which example shows emotional intelligence at work?',
            options: [
                'Matching a customer\'s anger with your own anger',
                'Recognizing your emotions and responding in a controlled manner',
                'Ignoring how your tone affects others',
                'Mocking a difficult situation after the call'
            ],
            answer: 1
        },
        {
            q: 'Why is accurate note-taking important after a customer interaction?',
            options: [
                'It is optional if the agent remembers the details',
                'It helps future agents understand the case and supports quality review',
                'It is only needed when the customer is angry',
                'It should be done only once a month'
            ],
            answer: 1
        },
        {
            q: 'You receive feedback from a quality analyst about your communication style. What is the best response?',
            options: [
                'Reject all feedback as unfair',
                'Listen, ask clarifying questions, and apply useful suggestions',
                'Argue with the analyst in front of the team',
                'Ignore feedback unless it affects your salary immediately'
            ],
            answer: 1
        },
        {
            q: 'What should you do if a customer uses offensive language toward you?',
            options: [
                'Respond with the same language to show strength',
                'Remain professional, set respectful boundaries, and follow escalation procedures',
                'Hang up immediately without reporting the incident',
                'Share the customer\'s comments with friends online'
            ],
            answer: 1
        },
        {
            q: 'Which habit helps maintain focus during repetitive work?',
            options: [
                'Checking personal social media throughout every call',
                'Taking short planned breaks and staying organized',
                'Working while severely sleep-deprived every day',
                'Changing approved procedures for variety'
            ],
            answer: 1
        },
        {
            q: 'A customer thanks you for resolving their issue. How should you respond?',
            options: [
                'Say nothing and disconnect immediately',
                'Respond politely and confirm any next steps if needed',
                'Tell them they should have called sooner',
                'Ask them to post a public complaint anyway'
            ],
            answer: 1
        },
        {
            q: 'What is the best reason to follow a standard operating procedure?',
            options: [
                'It removes the need to think in any situation',
                'It promotes consistency, compliance, and reliable service',
                'It is only for new trainees',
                'It makes customer issues harder to solve'
            ],
            answer: 1
        },
        {
            q: 'You observe a security policy being violated by someone on the floor. What should you do?',
            options: [
                'Ignore it to avoid conflict',
                'Report it through the proper channel according to company policy',
                'Discuss the customer\'s private details with others to warn them',
                'Post about it on a public forum'
            ],
            answer: 1
        },
        {
            q: 'Which statement best describes a growth mindset at work?',
            options: [
                'Believing skills cannot improve with effort',
                'Viewing challenges as opportunities to learn and improve',
                'Avoiding all feedback to protect confidence',
                'Assuming experience makes training unnecessary'
            ],
            answer: 1
        },
        {
            q: 'Why is empathy important when a customer is frustrated?',
            options: [
                'It guarantees the customer will agree with every policy',
                'It helps the customer feel heard and can reduce tension',
                'It means agreeing that the company is always wrong',
                'It replaces the need for accurate information'
            ],
            answer: 1
        },
        {
            q: 'An agent consistently arrives late and misses briefings. How might this affect the team?',
            options: [
                'It has no effect on service or morale',
                'It can disrupt workflow and increase pressure on others',
                'It automatically improves team performance',
                'It only matters during annual reviews'
            ],
            answer: 1
        },
        {
            q: 'What is the most ethical way to handle a conflict with a coworker?',
            options: [
                'Spread rumors to pressure them to quit',
                'Address the issue respectfully or involve a supervisor if needed',
                'Sabotage their work to prove a point',
                'Refuse to communicate with them permanently'
            ],
            answer: 1
        },
        {
            q: 'A customer requests an update on a case you cannot access. What should you do?',
            options: [
                'Invent a status update to keep them happy',
                'Explain the limitation and follow the approved escalation or transfer process',
                'Tell them the company has lost their information',
                'Promise a refund without authorization'
            ],
            answer: 1
        },
        {
            q: 'Which behavior supports a positive workplace culture?',
            options: [
                'Respecting diversity and treating everyone fairly',
                'Excluding teammates who are new to the process',
                'Celebrating one person\'s mistakes in group chat',
                'Refusing to collaborate across shifts'
            ],
            answer: 0
        },
        {
            q: 'At the end of a demanding shift, what is a healthy professional habit?',
            options: [
                'Carry all stress home without decompressing',
                'Reflect on what went well, note lessons learned, and rest appropriately',
                'Ignore all process updates until next month',
                'Criticize every customer you spoke with'
            ],
            answer: 1
        }
    ],
    typingPassage: `A healthy environment supports every form of life on our shared planet.
Trees absorb carbon dioxide and release the oxygen that humans and animals need daily.
Rivers and lakes provide fresh water for communities, farms, and natural wildlife habitats.
Recycling plastic and paper reduces waste that would otherwise pollute land and oceans.
Solar panels and wind turbines generate clean energy without burning harmful fossil fuels.
Simple habits like saving water and planting trees protect nature for future generations.`,
    voicePrompts: [
        { type: 'word', text: 'Hello', minDuration: 1 },
        { type: 'word', text: 'Support', minDuration: 1 },
        { type: 'word', text: 'Resolve', minDuration: 1 },
        { type: 'phrase', text: 'Thank you for waiting.', minDuration: 3 },
        { type: 'phrase', text: 'I understand your concern.', minDuration: 3 },
        { type: 'phrase', text: 'Let me verify the details.', minDuration: 3 },
        { type: 'sentence', text: 'I will review your ticket and provide an update within the agreed timeline.', minDuration: 6 },
        { type: 'sentence', text: 'Please confirm your registered email address so I can locate your account securely.', minDuration: 6 },
        { type: 'sentence', text: 'I apologize for the inconvenience and appreciate your patience while we complete this review.', minDuration: 7 },
        { type: 'long', text: 'Thank you for contacting Trinitas support. Today, my name is your dedicated agent. I will review your ticket details, service history, and escalation notes carefully before sharing a clear resolution plan within our agreed service-level timeline.', minDuration: 12 }
    ]
};