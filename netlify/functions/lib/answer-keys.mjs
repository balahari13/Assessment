/** Auto-derived answer keys for server-side rescoring. Do not expose to clients. */
export const ANSWER_KEYS = {
  1: {
    grammar: [1,1,1,1,1,1,1,0,3,1,1,1,0,0,1,1,2,1,1,1,1,1,1,1,1],
    reading: [1,2,1,1,2,2],
    workplace: [1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    fillBlank: [["attached","enclosed"],["up"],["inconvenience","inconvenience caused"],["account","phone","mobile"],["escalated","assigned","forwarded"],["on"],["within","in"],["confidentiality","privacy"],["starts","begins"],["accurately","clearly","properly"]]
  },
  2: {
    grammar: [2,1,2,1,1,1,1,2,1,0,1,2,1,1,0,2,3,0,1,1,3,1,3,1,1],
    reading: [1,1,2,1,2,1],
    workplace: [2,2,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    fillBlank: [["homophone","homophones"],["spokesperson","advocate","representative"],["mitigate","alleviate"],["ubiquitous"],["covenant","contract","accord"],["forbidden"],["arbiter","arbitrator"],["waive","relinquish"],["paradox"],["persuasion"]]
  }
};

export const SECTION_WEIGHTS = {
  grammar: 0.14,
  reading: 0.08,
  workplace: 0.14,
  email: 0.14,
  typing: 0.15,
  voice: 0.35
};
