/**
 * Article 4 training modules — self-contained lesson + quiz content served on
 * the public magic-link training page. Versioned: the attestation hash embeds
 * MODULE_CONTENT_VERSION so a regulator can verify which content a member saw.
 *
 * EU AI Act Article 4 (enforceable since 2 Feb 2025): providers and deployers
 * must ensure a sufficient level of AI literacy of their staff, accounting for
 * technical knowledge, experience, education, and the context of use.
 */

export const MODULE_CONTENT_VERSION = '2.0.0';

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

  // ─── Role tracks (v2) — Article 4 requires literacy appropriate to the
  // member's role and context; these four go beyond the all-staff core. ───
  {
    id: 'leadership-accountability',
    title: 'AI Accountability for Leadership',
    minutes: 14,
    audience: 'Executives, directors, and budget owners',
    lessons: [
      {
        heading: 'You cannot delegate accountability',
        body: 'Under the AI Act, obligations attach to the ORGANISATION — and regulators, boards, and courts look to leadership when they fail. You can delegate the work of compliance; you cannot delegate accountability for it. The practical consequence: every AI system that affects people or material outcomes needs a named owner who reports to someone in this room, a written purpose, and a route by which problems reach you before they reach a regulator. If you cannot name the owner of a system in one minute, that system is your risk.',
      },
      {
        heading: 'The five questions to ask before approving AI',
        body: 'Before any AI initiative gets budget or sign-off, ask: (1) What decision or output does it produce, and who is affected? (2) Which AI Act risk tier does that put us in — and who verified that classification? (3) What data trains and feeds it, and do we have the rights and lawful basis for that data? (4) Who reviews outputs, with what authority to override? (5) How do we turn it off, and what happens when we do? A team that answers these crisply is ready. A team that improvises is asking you to absorb unquantified regulatory risk.',
      },
      {
        heading: 'What the penalties actually punish',
        body: 'Maximum fines — €35M or 7% of global turnover for prohibited practices; €15M or 3% for most other violations — are not triggered by using AI. They punish the absence of governance: undocumented systems, missing human oversight, no records when a regulator asks. This is why "we did not know the team was using it" is the most expensive sentence in AI compliance. Budget for inventory, oversight, and training the way you budget for financial controls: as the cost of being allowed to operate.',
      },
      {
        heading: 'Setting the tone: incentives beat policies',
        body: 'Staff adopt the AI behaviour leadership rewards. If speed is praised and diligence is invisible, shadow AI grows. Three signals that work: publicly fast-track tool approvals so the compliant path is also the fast path; treat reported AI incidents and near-misses as learning, never as career damage; and put AI-readiness metrics in the same reviews as revenue metrics. Governance that only exists in a policy PDF does not exist.',
      },
    ],
    quiz: [
      { q: 'Who carries accountability for an AI system a vendor built and a junior team deployed?', options: ['The vendor', 'The junior team', 'The organisation — and its leadership', 'Nobody until an incident occurs'], correct: 2 },
      { q: 'Which question matters MOST before approving an AI system that screens loan applications?', options: ['How much does it cost?', 'What risk tier is it, and who verified that?', 'Which model architecture does it use?', 'Can it be branded?'], correct: 1 },
      { q: 'AI Act penalties primarily punish…', options: ['Using AI at all', 'The absence of governance: no documentation, oversight, or records', 'Using non-EU vendors', 'Slow adoption'], correct: 1 },
      { q: 'The most effective way leadership reduces shadow AI is…', options: ['Banning all AI tools', 'Making the approved path fast and rewarding disclosure', 'Annual policy reminders by email', 'Blocking AI websites'], correct: 1 },
      { q: '"We did not know the team was using it" is legally…', options: ['A valid defence', 'An admission of missing governance', 'Irrelevant either way', 'Only a GDPR issue'], correct: 1 },
    ],
    passThreshold: 0.8,
  },
  {
    id: 'builders-technical',
    title: 'Building & Operating AI Responsibly',
    minutes: 16,
    audience: 'Engineers, data scientists, and technical operators',
    lessons: [
      {
        heading: 'Classification is an engineering input, not legal trivia',
        body: 'The system you build inherits obligations from its USE, not its architecture. The same model is minimal-risk drafting emails and high-risk ranking job applicants. Before building: write one sentence — "this system produces X, which affects Y" — and check it against the AI Act high-risk categories (employment, credit, education, essential services, biometrics, safety components). If it lands high-risk, requirements like risk management, data governance, logging, human oversight, and technical documentation become part of the definition of done — designing them in later costs ten times more.',
      },
      {
        heading: 'Data governance is a build-time duty',
        body: 'For consequential systems you must be able to answer: where did training and input data come from, do we have rights to it, is it relevant and representative for the population the system affects, and how are errors and gaps handled? Concretely: keep provenance for every dataset (source, licence, date, transformations); test performance across the subgroups the system will actually meet; and document known limitations where the next engineer will read them. "The data was already in the warehouse" is provenance for nobody.',
      },
      {
        heading: 'Logs are your defence — design them',
        body: 'When an AI decision is challenged, the questions are: what version ran, what inputs did it see, what did it output, who reviewed it? If your logs cannot answer all four for any past decision, the organisation has no defence. Log model/prompt versions, input references (not raw personal data where avoidable), outputs, confidence where available, and reviewer actions. Retention follows the decision\'s consequences: an employment decision may be challenged years later.',
      },
      {
        heading: 'Human oversight that engineers can actually build',
        body: 'Genuine oversight is an interface property: the reviewer must see WHY (key inputs/factors), have real authority to override without friction, and their overrides must be logged and fed back. Anti-patterns to refuse: approve-all buttons, review queues sized so nobody can genuinely review, and explanations generated after the fact to justify an output. If the review step is theatre, the system fails the moment a regulator or journalist tests it.',
      },
    ],
    quiz: [
      { q: 'What determines whether your system is high-risk under the AI Act?', options: ['Model size', 'Its intended use and who it affects', 'Whether it uses an LLM', 'Hosting location'], correct: 1 },
      { q: 'Which is REQUIRED data-governance practice for a consequential system?', options: ['Using only public datasets', 'Provenance records and representativeness testing for affected groups', 'Retraining monthly', 'Encrypting the model weights'], correct: 1 },
      { q: 'A candidate challenges an AI-assisted rejection from 14 months ago. Your logs must show…', options: ['Only the final decision', 'Version, inputs, output, and reviewer action for that decision', 'Aggregate accuracy statistics', 'The model\'s training loss'], correct: 1 },
      { q: 'Which review design constitutes genuine human oversight?', options: ['Reviewer sees key factors, can override without friction, override is logged', 'Reviewer approves batches of 500', 'AI explains itself after the decision ships', 'A weekly sample audit of 1%'], correct: 0 },
      { q: 'When should high-risk requirements enter the development process?', options: ['After launch, if flagged', 'During legal review', 'At design time, as part of the definition of done', 'Only for public-sector clients'], correct: 2 },
    ],
    passThreshold: 0.8,
  },
  {
    id: 'procurement-vendors',
    title: 'Buying AI Without Buying Trouble',
    minutes: 12,
    audience: 'Procurement, vendor managers, and tool owners',
    lessons: [
      {
        heading: 'Buying AI means inheriting obligations',
        body: 'When you deploy a vendor\'s AI system, your organisation becomes the DEPLOYER under the AI Act — with its own duties: using the system per its instructions, ensuring human oversight, monitoring operation, and keeping logs. "The vendor handles compliance" is a category error: the vendor handles PROVIDER duties for the product; nobody but you can perform your deployer duties. Procurement is where those duties become contractual — or become gaps.',
      },
      {
        heading: 'The questions that separate serious vendors',
        body: 'Before signature, get written answers: Does the tool train on our data, and can that be disabled contractually? Where is data processed and stored, and under what transfer mechanism? Is there a DPA, and does it survive subprocessor changes? What is the intended purpose per the vendor — and does OUR intended use match it? What logging and export do we get for audits? What is the notification duty when the model materially changes? A vendor who answers crisply is a partner; one who answers with marketing is a risk transfer onto you.',
      },
      {
        heading: 'Red flags that should stop a purchase',
        body: 'Walk away, or escalate before signing, when you see: training-on-your-data enabled with no contractual off-switch; no DPA or a DPA that excludes AI features; "AI-powered" claims with no documentation of what the AI actually does; consumer terms of service for a business-critical workflow; pricing that requires sending more data than the use case needs; and silence on model-change notifications — the tool you assessed in January is not the tool running in June.',
      },
    ],
    quiz: [
      { q: 'Your organisation deploys a vendor AI hiring tool. Who holds deployer obligations?', options: ['The vendor', 'Your organisation', 'The applicants', 'The app store'], correct: 1 },
      { q: 'Which contract term is a hard requirement when the tool will touch personal data?', options: ['A discount schedule', 'A data-processing agreement covering the AI features', 'An innovation-partnership clause', 'A logo-usage right'], correct: 1 },
      { q: 'A vendor cannot say whether your data trains their models. That is…', options: ['Normal industry practice', 'A red flag to resolve contractually before signing', 'Fine if the tool is popular', 'Only an issue for public bodies'], correct: 1 },
      { q: 'Why do model-change notification clauses matter?', options: ['They lower the price', 'The assessed tool can change materially after purchase', 'Regulators require monthly updates', 'They prevent downtime'], correct: 1 },
    ],
    passThreshold: 0.75,
  },
  {
    id: 'hr-people-decisions',
    title: 'AI in People Decisions (High-Risk Zone)',
    minutes: 14,
    audience: 'HR, recruiters, and people managers',
    lessons: [
      {
        heading: 'Why HR is the AI Act\'s centre of gravity',
        body: 'AI used for recruitment, screening, evaluating candidates, promotion, task allocation, or monitoring performance is explicitly HIGH-RISK under the AI Act. That includes the CV-ranking feature inside your ATS, the "engagement scoring" in your HR suite, and the meeting-transcription tool that summarises interviews. If software influences who gets hired, promoted, disciplined, or dismissed, it is in scope — whether or not the vendor calls it AI.',
      },
      {
        heading: 'Your duties when using these tools',
        body: 'As deployer of a high-risk HR system you must: use it per the vendor\'s stated intended purpose; ensure a trained human reviews outputs with real authority to override; monitor for skewed outcomes across groups; keep logs of decisions; and inform candidates/workers that AI is used in the process where required. Practically: never let a ranking become a rejection without human judgement, and never rely on a score you could not explain to the person it affects.',
      },
      {
        heading: 'Bias: what it looks like in HR practice',
        body: 'Bias rarely announces itself. It looks like: penalising employment gaps (proxy for caregiving), preferring specific universities or postcodes (proxy for class and ethnicity), scoring accents in video interviews, or "culture fit" scores trained on your historical hires. Countermeasures that work: strip proxies where feasible, compare shortlist demographics with applicant demographics on a schedule, document overrides and why, and route anomalies to a named owner — silent manual corrections hide the problem while keeping the liability.',
      },
      {
        heading: 'The candidate\'s rights are your checklist',
        body: 'People affected by automated decisions have rights: to know AI is involved, to obtain meaningful information about the logic, to contest decisions, and to human review (GDPR Art 22 interacts with the AI Act here). Build your process so those rights are answerable on demand: a candidate asks "why was I rejected?" — your team should produce the human-reviewed reasoning within days, not discover the tool cannot explain itself.',
      },
    ],
    quiz: [
      { q: 'Which of these is high-risk under the AI Act?', options: ['A chatbot answering HR policy questions', 'CV-ranking inside your ATS', 'A meeting-room booking system', 'Payroll calculation software'], correct: 1 },
      { q: 'An AI tool ranks a candidate last. The compliant next step is…', options: ['Auto-reject with a polite email', 'Human review with authority and documented reasoning before any decision', 'Lower the score threshold', 'Ask the vendor to re-rank'], correct: 1 },
      { q: 'Which pattern most suggests proxy bias?', options: ['Preferring candidates with more experience', 'Penalising employment gaps and specific postcodes', 'Ranking by required certifications', 'Flagging incomplete applications'], correct: 1 },
      { q: 'A rejected candidate asks how the decision was made. Your organisation must…', options: ['Refuse — trade secrets', 'Provide meaningful information and access to human review', 'Send the model\'s weights', 'Only respond if they sue'], correct: 1 },
      { q: 'Quietly correcting a biased AI ranking by hand…', options: ['Solves the problem', 'Hides the pattern while keeping the liability — report it instead', 'Is required by GDPR', 'Improves the model'], correct: 1 },
    ],
    passThreshold: 0.8,
  },
];

export function getTrainingModule(id: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === id);
}

/**
 * Role tracks — Article 4 requires literacy appropriate to role and context.
 * The core four apply to everyone; each track adds the role-specific module(s).
 */
export const ROLE_TRACKS: Record<string, { label: string; moduleIds: string[] }> = {
  everyone: {
    label: 'All staff (core)',
    moduleIds: ['ai-fundamentals', 'eu-ai-act-basics', 'data-privacy-ai', 'responsible-use'],
  },
  leadership: {
    label: 'Leadership & decision-makers',
    moduleIds: ['ai-fundamentals', 'eu-ai-act-basics', 'leadership-accountability'],
  },
  technical: {
    label: 'Engineers & data teams',
    moduleIds: ['ai-fundamentals', 'eu-ai-act-basics', 'data-privacy-ai', 'builders-technical'],
  },
  procurement: {
    label: 'Procurement & vendor owners',
    moduleIds: ['ai-fundamentals', 'eu-ai-act-basics', 'procurement-vendors'],
  },
  hr: {
    label: 'HR & people managers',
    moduleIds: ['ai-fundamentals', 'eu-ai-act-basics', 'data-privacy-ai', 'hr-people-decisions'],
  },
};
