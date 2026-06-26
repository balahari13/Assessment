window.ASSESSMENT_DATA = {
    totalMinutes: 35,
    sections: [
        { id: 'grammar', label: 'Basic English', minutes: 18, weight: 0.35 },
        { id: 'typing', label: 'Typing Speed', minutes: 3, weight: 0.35 },
        { id: 'voice', label: 'Voice Assessment', minutes: 14, weight: 0.30 }
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
        { type: 'long', text: 'Thank you for contacting Trinitas support today my name is your dedicated agent I will review your ticket details service history and escalation notes carefully before sharing a clear resolution plan within our agreed service level timeline.', minDuration: 12 }
    ]
};