window.ASSESSMENT_DATA = {
    totalMinutes: 35,
    sections: [
        { id: 'grammar', label: 'Advanced Grammar', minutes: 18, weight: 0.35 },
        { id: 'typing', label: 'Typing Speed', minutes: 3, weight: 0.35 },
        { id: 'voice', label: 'Voice Assessment', minutes: 14, weight: 0.30 }
    ],
    grammarQuestions: [
        { q: 'Neither the supervisor nor the agents ___ available for the callback.', options: ['was', 'were', 'is', 'has been'], answer: 1 },
        { q: 'Choose the correct subjunctive form: The manager insisted that the report ___ submitted before noon.', options: ['is', 'was', 'be', 'being'], answer: 2 },
        { q: 'Which sentence avoids a dangling modifier?', options: ['After reviewing the ticket, the resolution was sent.', 'After reviewing the ticket, the agent sent the resolution.', 'The resolution was sent after reviewing the ticket.', 'Reviewing the ticket, the resolution was sent by email.'], answer: 1 },
        { q: 'Select the correct parallel structure.', options: ['The role requires typing, to communicate, and solving problems.', 'The role requires typing, communicating, and solving problems.', 'The role requires to type, communicating, and problem solve.', 'The role requires typing, communicate, and to solve problems.'], answer: 1 },
        { q: 'Identify the correct use of "who" vs "whom".', options: ['The client who I spoke to was satisfied.', 'The client whom I spoke to was satisfied.', 'The client whom spoke to me was satisfied.', 'The client who to I spoke was satisfied.'], answer: 1 },
        { q: 'Which option correctly uses a semicolon?', options: ['The queue is full; therefore we will call back.', 'The queue is full; therefore, we will call back.', 'The queue is full therefore; we will call back.', 'The queue is full; therefore we, will call back.'], answer: 1 },
        { q: 'Choose the best formal passive construction.', options: ['We will process your refund tomorrow.', 'Your refund will be processed tomorrow.', 'Tomorrow we are processing your refund.', 'Processing your refund happens tomorrow.'], answer: 1 },
        { q: 'Which sentence correctly uses "fewer" or "less"?', options: ['There are less tickets in the queue today.', 'There are fewer tickets in the queue today.', 'There is fewer ticket volume today.', 'There are less than five tickets.'], answer: 1 },
        { q: 'Select the proper conditional sentence (Type 2).', options: ['If I would know the SLA, I would respond faster.', 'If I knew the SLA, I would respond faster.', 'If I know the SLA, I would respond faster.', 'If I had knew the SLA, I would respond faster.'], answer: 1 },
        { q: 'Which option uses the correct comparative form of "bad"?', options: ['This escalation is more bad than the last one.', 'This escalation is badder than the last one.', 'This escalation is worse than the last one.', 'This escalation is worst than the last one.'], answer: 2 },
        { q: 'Identify the sentence with correct subject-verb agreement.', options: ['The data from the CRM indicate a delay.', 'The data from the CRM indicates a delay.', 'The data from the CRM are indicating a delay.', 'The data from the CRM have indicated a delay.'], answer: 1 },
        { q: 'Choose the correct pronoun-antecedent agreement.', options: ['Each agent must update their status hourly.', 'Each agent must update his or her status hourly.', 'Each agent must update their statuses hourly.', 'Each agents must update his status hourly.'], answer: 1 },
        { q: 'Which sentence uses the colon correctly?', options: ['Please note: that the SLA is 24 hours.', 'Please note the following: the SLA is 24 hours.', 'Please: note the SLA is 24 hours.', 'Please note the following, the SLA is 24 hours.'], answer: 1 },
        { q: 'Select the best option for a hypothetical past situation.', options: ['If we would have trained earlier, errors would reduce.', 'If we had trained earlier, errors would have reduced.', 'If we trained earlier, errors would have reduced.', 'If we have trained earlier, errors would reduce.'], answer: 1 },
        { q: 'Which sentence is free of a comma splice?', options: ['The ticket is urgent, we will escalate it.', 'The ticket is urgent; we will escalate it.', 'The ticket is urgent we will escalate it.', 'The ticket is urgent, and we will escalate it and.'], answer: 1 },
        { q: 'Choose the correct word: The compliance team will ___ the policy update.', options: ['except', 'accept', 'access', 'excess'], answer: 1 },
        { q: 'Which option shows correct apostrophe use?', options: ["The agent's KPIs improved this month.", 'The agents KPIs improved this month.', 'The agents\'s KPIs improved this month.', 'The agent KPI\'s improved this month.'], answer: 0 },
        { q: 'Identify the adverb modifying the verb correctly.', options: ['She handled the complaint good.', 'She handled the complaint well.', 'She good handled the complaint.', 'She handled good the complaint.'], answer: 1 },
        { q: 'Select the sentence with correct word order in an indirect question.', options: ['Could you tell me where is the ticket number?', 'Could you tell me where the ticket number is?', 'Could you tell me where the ticket number it is?', 'Could you tell me is where the ticket number?'], answer: 1 },
        { q: 'Which phrase is appropriate in executive-level BPO communication?', options: ['We messed up your order.', 'We regret the inconvenience caused and are correcting the issue.', 'Your order got broken by us.', 'Not our fault, try again later.'], answer: 1 },
        { q: 'Choose the correct use of "affect" or "effect".', options: ['The outage will effect our response times.', 'The outage will affect our response times.', 'The outage will affects our response times.', 'The outage will affecting our response times.'], answer: 1 },
        { q: 'Which sentence uses "literally" appropriately in formal writing?', options: ['I literally died when I saw the queue.', 'The server was literally unreachable during the outage.', 'I literally exploded with laughter on the call.', 'We literally broke the internet today.'], answer: 1 },
        { q: 'Select the best transformation to reported speech.', options: ['He said that he is calling the client tomorrow.', 'He said that he would call the client the next day.', 'He said that he will call the client tomorrow.', 'He said he calls the client the next day.'], answer: 1 },
        { q: 'Which option maintains consistent verb tense?', options: ['She logs the case and escalated it immediately.', 'She logged the case and escalated it immediately.', 'She logged the case and escalates it immediately.', 'She logging the case and escalated it immediately.'], answer: 1 },
        { q: 'Identify the sentence with correct use of "among" vs "between".', options: ['The task was divided among the two teams.', 'The task was divided between the two teams.', 'The task was divided between all agents in the floor.', 'The task was divided among two member.'], answer: 1 }
    ],
    typingPassage: `Customer service excellence in a business process outsourcing environment demands more than speed alone.
Agents must listen actively, interpret incomplete information, and respond with clarity under measurable service level agreements.
Accurate typing supports every channel including live chat, email, ticketing systems, and internal escalation notes.
A single typing error in an account number, refund amount, or compliance statement can create rework, customer dissatisfaction, and audit risk.
Professional BPO operators therefore balance pace with precision while maintaining a courteous and confident tone.
They document each interaction thoroughly so downstream teams can continue the workflow without confusion or delay.
Remote work requires additional discipline because supervisors cannot physically observe performance on the floor.
Successful candidates demonstrate focus, consistency, and accountability when handling high volumes across extended shifts.
This assessment measures how quickly and accurately you can reproduce business-critical language in a timed environment.
Read carefully, type exactly what appears above, and proofread before submitting your response.`,
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