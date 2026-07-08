/**
 * Article 4 training modules — self-contained lesson + quiz content served on
 * the public magic-link training page. Versioned: the attestation hash embeds
 * MODULE_CONTENT_VERSION so a regulator can verify which content a member saw.
 *
 * EU AI Act Article 4 (enforceable since 2 Feb 2025): providers and deployers
 * must ensure a sufficient level of AI literacy of their staff, accounting for
 * technical knowledge, experience, education, and the context of use.
 */

export const MODULE_CONTENT_VERSION = '1.0.0';

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number; // index into options
}

export interface TrainingModule {
  id: string;
  title: string;
  minutes: number;
  audience: string;
  lessons: { heading: string; body: string }[];
  quiz: QuizQuestion[];
  passThreshold: number; // fraction correct required, e.g. 0.6
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'ai-fundamentals',
    title: 'AI Fundamentals',
    minutes: 12,
    audience: 'All staff',
    lessons: [
      {
        heading: 'What AI systems actually do',
        body: 'Modern AI systems are statistical pattern-matchers trained on large datasets. They predict likely outputs from inputs — they do not "understand" content the way people do. This means outputs can be fluent and confident while being wrong ("hallucination"). Treat AI output as a draft from a fast, well-read, but unreliable assistant: useful, never authoritative.',
      },
      {
        heading: 'Capabilities and limits',
        body: 'AI is strong at summarising, drafting, translating, classifying, and finding patterns. It is weak at: guaranteeing factual accuracy, reasoning about events after its training cutoff, mathematics without tools, and knowing what it does not know. If a task has a "correct answer that matters" (legal text, figures, names, dates), the answer must be verified by a person before use.',
      },
      {
        heading: 'Your responsibility as a user',
        body: 'When you use an AI tool at work, YOU remain responsible for the output. Rules of thumb: (1) never paste confidential, personal, or client data into tools that are not approved by your organisation; (2) verify facts before they leave the building; (3) disclose AI assistance where your organisation or the law requires it; (4) if an AI decision affects a person (hiring, scoring, access to services), a human must be able to review and override it.',
      },
    ],
    quiz: [
      { q: 'An AI chatbot gives you a confident, detailed answer. What does this confidence tell you about accuracy?', options: ['Confident answers are usually accurate', 'Nothing — fluency and accuracy are independent', 'It means the model has verified its sources'], correct: 1 },
      { q: 'You want to summarise a contract containing client personal data with a free public AI tool. What should you do?', options: ['Go ahead — summaries are harmless', 'Remove the names first, that is enough', 'Use only tools approved by your organisation for that data class'], correct: 2 },
      { q: 'Who is responsible for an error in AI-generated work you submit?', options: ['The AI vendor', 'You', 'Nobody — errors are expected'], correct: 1 },
      { q: 'Which task most needs human verification before use?', options: ['Brainstorming slogan ideas', 'A summary of regulatory penalties with figures and article numbers', 'Rewriting a paragraph in a friendlier tone'], correct: 1 },
    ],
    passThreshold: 0.75,
  },
  {
    id: 'eu-ai-act-basics',
    title: 'EU AI Act Essentials',
    minutes: 15,
    audience: 'All staff in organisations operating in or serving the EU',
    lessons: [
      {
        heading: 'The risk-based structure',
        body: 'The EU AI Act (Regulation 2024/1689) regulates AI by risk level. Prohibited practices (social scoring, exploitative manipulation, most real-time remote biometric ID in public) are banned outright since February 2025. High-risk systems (AI in hiring, credit, education, essential services, safety components) carry heavy obligations from August 2026. Limited-risk systems (chatbots, deepfakes) need transparency: people must know they are interacting with AI. Everything else is minimal risk.',
      },
      {
        heading: 'What this means day-to-day',
        body: 'Before adopting an AI tool for a workflow, ask: does this touch decisions about people (hiring, evaluation, access to services)? If yes, it may be high-risk and needs registration, documentation, and human oversight — talk to your compliance lead BEFORE deployment, not after. Using an unapproved AI tool for a high-risk purpose can expose the organisation to penalties up to €35M or 7% of global turnover.',
      },
      {
        heading: 'Article 4 — why you are taking this training',
        body: 'Article 4 requires organisations to ensure staff have sufficient AI literacy for their role and context. It has applied since 2 February 2025. Completing this module — and the record of your completion — is part of how your organisation demonstrates that duty to regulators.',
      },
    ],
    quiz: [
      { q: 'Which of these has been prohibited in the EU since February 2025?', options: ['Chatbots without disclosure', 'Social scoring of citizens', 'AI-assisted document drafting'], correct: 1 },
      { q: 'Your team wants an AI tool to shortlist job applicants. What applies?', options: ['Nothing — recruiting tools are minimal risk', 'It is likely HIGH-RISK under the AI Act and needs compliance review before use', 'Only GDPR applies, not the AI Act'], correct: 1 },
      { q: 'Maximum penalties under the EU AI Act are…', options: ['€10M or 2% of turnover', '€20M or 4% of turnover', '€35M or 7% of global turnover'], correct: 2 },
      { q: 'Article 4 of the AI Act requires organisations to…', options: ['Register all AI tools with the EU', 'Ensure sufficient AI literacy of their staff', 'Ban generative AI at work'], correct: 1 },
    ],
    passThreshold: 0.75,
  },
  {
    id: 'data-privacy-ai',
    title: 'Data Protection When Using AI',
    minutes: 10,
    audience: 'All staff handling personal or confidential data',
    lessons: [
      {
        heading: 'Where the data goes',
        body: 'When you paste text into an AI tool, that text is sent to the vendor\'s servers. Depending on the tool and plan, it may be stored, reviewed by humans, or used to train future models. Consumer/free tiers usually have the weakest guarantees. Your organisation\'s approved-tools list exists precisely because these terms differ enormously between vendors and plans.',
      },
      {
        heading: 'Personal data rules still apply',
        body: 'GDPR does not pause because a tool is "AI". Sending personal data to an AI vendor is a disclosure to a processor: it needs a lawful basis, a data-processing agreement, and — outside the EU/EEA — a valid transfer mechanism. Special-category data (health, beliefs, biometrics) needs stronger justification. When in doubt: anonymise, minimise, or ask your DPO.',
      },
      {
        heading: 'Practical hygiene',
        body: 'Default-safe habits: use work accounts on approved tools only; turn OFF chat-history/training where the tool allows; never upload documents whose leak would be reportable; prefer structured redaction over trusting a tool\'s privacy promise; report accidental disclosure to your DPO immediately — early reporting is a mitigation, hiding it is a violation.',
      },
    ],
    quiz: [
      { q: 'You paste a customer complaint containing a name and account number into a free AI chatbot. What just happened?', options: ['Nothing regulated — it is only a draft', 'A disclosure of personal data to a third-party processor', 'A GDPR violation only if the customer finds out'], correct: 1 },
      { q: 'Which is the safest default?', options: ['Free consumer AI tools with history enabled', 'Approved enterprise tools with training-on-data disabled', 'Any tool, as long as you delete the chat afterwards'], correct: 1 },
      { q: 'You accidentally uploaded a client file to an unapproved tool. Best action?', options: ['Delete the chat and move on', 'Report to your DPO immediately', 'Wait to see if anyone notices'], correct: 1 },
    ],
    passThreshold: 0.66,
  },
  {
    id: 'responsible-use',
    title: 'Responsible AI Use in Your Role',
    minutes: 10,
    audience: 'All staff using AI tools in daily work',
    lessons: [
      {
        heading: 'Human oversight is a design duty, not a slogan',
        body: 'Wherever AI output feeds a decision about a person or a material business outcome, a human must genuinely review it — not rubber-stamp it. Genuine review means: you could explain the decision without the AI, you checked the inputs the AI relied on, and you have authority to override. If reviewing every output is impractical, the process — not the reviewer — is broken; escalate it.',
      },
      {
        heading: 'Bias and fairness in practice',
        body: 'AI models reproduce patterns in their training data, including historical bias. Watch for: recommendations that skew by gender/ethnicity/age proxies (postcodes, names, career gaps), performance differences across languages, and "objective" scores laundering subjective judgements. If you see skewed outputs, do not correct silently — report them so the tool can be reassessed for everyone.',
      },
      {
        heading: 'Shadow AI — why unapproved tools matter',
        body: 'Using unapproved AI tools ("shadow AI") is how organisations fail audits: data flows nobody mapped, decisions nobody logged, obligations nobody knew applied. If a tool genuinely helps, propose it for approval — most organisations fast-track useful tools once security and data terms are checked. The risk is not the tool; it is the invisibility.',
      },
    ],
    quiz: [
      { q: 'What makes human oversight of an AI decision "genuine"?', options: ['A human clicks Approve on each item', 'The reviewer can explain, check inputs, and override', 'The AI vendor certifies the model'], correct: 1 },
      { q: 'An AI screening tool consistently ranks candidates from one university lower. You should…', options: ['Adjust scores manually and continue', 'Report the pattern for reassessment of the tool', 'Ignore it — models know best'], correct: 1 },
      { q: 'Why is "shadow AI" a compliance problem?', options: ['Unapproved tools are always less accurate', 'It creates unmapped data flows and unlogged decisions', 'It costs more'], correct: 1 },
    ],
    passThreshold: 0.66,
  },
];

export function getTrainingModule(id: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === id);
}
