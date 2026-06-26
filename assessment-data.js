window.ASSESSMENT_DATA = {
    totalMinutes: 30,
    sections: [
        { id: 'grammar', label: 'Basic Grammar', minutes: 12, weight: 0.35 },
        { id: 'typing', label: 'Typing Speed', minutes: 10, weight: 0.35 },
        { id: 'voice', label: 'Voice Assessment', minutes: 8, weight: 0.30 }
    ],
    grammarQuestions: [
        { q: 'Choose the correct sentence.', options: ['She don\'t like coffee.', 'She doesn\'t like coffee.', 'She not like coffee.', 'She no like coffee.'], answer: 1 },
        { q: 'Fill in: The team ___ working from home.', options: ['is', 'are', 'am', 'be'], answer: 0 },
        { q: 'Which is correct?', options: ['I have went there.', 'I have gone there.', 'I has gone there.', 'I gone there.'], answer: 1 },
        { q: 'Choose the right preposition: Please reply ___ email.', options: ['in', 'by', 'on', 'at'], answer: 1 },
        { q: 'Select the correct plural.', options: ['childs', 'children', 'childes', 'childrens'], answer: 1 },
        { q: 'Which sentence is formal?', options: ['Hey, gimme the file.', 'Please share the file at your earliest convenience.', 'Send file now ok?', 'File pls.'], answer: 1 },
        { q: 'Correct tense: Yesterday, we ___ the onboarding call.', options: ['have', 'had', 'has', 'having'], answer: 1 },
        { q: 'Choose the correct article.', options: ['A hour', 'An hour', 'A hours', 'An hours'], answer: 1 },
        { q: 'Which is a complete sentence?', options: ['Because the ticket was urgent.', 'The ticket was urgent.', 'When the ticket urgent.', 'Ticket urgent because.'], answer: 1 },
        { q: 'Select correct punctuation.', options: ['However we can proceed.', 'However, we can proceed.', 'However we, can proceed.', 'However; we can proceed,'], answer: 1 },
        { q: 'Choose the correct comparative.', options: ['more better', 'better', 'gooder', 'most better'], answer: 1 },
        { q: 'Correct subject-verb agreement.', options: ['Each of the agents are trained.', 'Each of the agents is trained.', 'Each of the agents were trained.', 'Each of the agents be trained.'], answer: 1 },
        { q: 'Pick the right word: The customer was ___ with the resolution.', options: ['satisfy', 'satisfied', 'satisfying', 'satisfaction'], answer: 1 },
        { q: 'Which is correct?', options: ['Their going to join.', 'They\'re going to join.', 'There going to join.', 'Theyre going to join.'], answer: 1 },
        { q: 'Choose the best option for BPO email.', options: ['Urgent!!! fix now!!!', 'We acknowledge your concern and are reviewing it.', 'Not our problem.', 'Whatever.'], answer: 1 },
        { q: 'Select the correct past participle.', options: ['I have wrote the report.', 'I have written the report.', 'I have writed the report.', 'I have writing the report.'], answer: 1 },
        { q: 'Which word fits: Please ___ the details below.', options: ['find', 'found', 'fill', 'filled'], answer: 2 },
        { q: 'Correct question form.', options: ['What time it is?', 'What time is it?', 'What is time it?', 'Time is what it?'], answer: 1 },
        { q: 'Choose the right conjunction.', options: ['I will call you, and I will email you.', 'I will call you, but I will email you.', 'Both are grammatically acceptable.', 'Neither is acceptable.'], answer: 2 },
        { q: 'Select the best professional closing.', options: ['Later,', 'Best regards,', 'TTYL,', 'Cya,'], answer: 1 }
    ],
    typingPassages: [
        'Customer service excellence begins with listening carefully to every concern and responding with clarity, empathy, and accuracy throughout each interaction.',
        'Trinitas agents follow structured workflows, maintain secure remote practices, and document every case update to ensure consistent quality across all channels.',
        'Accurate typing under time pressure is essential for BPO operations including chat support, email handling, data entry, and real-time ticket management.'
    ],
    voicePrompts: [
        'Good morning. Thank you for contacting Trinitas support. My name is [your name], and I will assist you with your request today. Could you please confirm your registered email address?',
        'I understand your concern regarding the delayed response. I apologize for the inconvenience caused. I am reviewing your case now and will provide an update within the next few minutes.',
        'To summarize, I have noted your request, escalated it to the operations team, and you will receive a confirmation email shortly. Thank you for your patience and have a great day.'
    ]
};