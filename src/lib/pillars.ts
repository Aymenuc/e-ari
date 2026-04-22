/**
 * E-ARI Pillar Definitions
 * 
 * The 8 readiness pillars, their weights, descriptions, and associated questions.
 * Each pillar has exactly 5 questions with Likert scale (1-5).
 * Weights sum to 1.0.
 */

export interface PillarQuestion {
  id: string;
  text: string;
  description: string;
  type: 'likert';
  required: boolean;
}

export interface PillarDefinition {
  id: string;
  name: string;
  shortName: string;
  weight: number;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  questions: PillarQuestion[];
}

export const MATURITY_BANDS = {
  laggard: { label: 'Laggard', min: 0, max: 25, color: '#ef4444', description: 'Minimal or no AI readiness. Organization lacks foundational elements for AI adoption.' },
  follower: { label: 'Follower', min: 26, max: 50, color: '#f59e0b', description: 'Early-stage readiness. Some initiatives exist but lack cohesion and strategic alignment.' },
  chaser: { label: 'Chaser', min: 51, max: 75, color: '#3b82f6', description: 'Progressing readiness. Key foundations are in place with active investment in AI capabilities.' },
  pacesetter: { label: 'Pacesetter', min: 76, max: 100, color: '#22c55e', description: 'Advanced readiness. Organization is well-positioned to leverage AI for competitive advantage.' },
} as const;

export type MaturityBand = keyof typeof MATURITY_BANDS;

export const PILLARS: PillarDefinition[] = [
  {
    id: 'strategy',
    name: 'Strategy & Vision',
    shortName: 'Strategy',
    weight: 0.15,
    description: 'Measures the alignment of AI initiatives with business objectives, the existence of a formal AI strategy, executive sponsorship, and long-term investment commitment.',
    icon: 'Target',
    color: '#3b82f6',
    questions: [
      {
        id: 'strategy_1',
        text: 'Does your organization have a formally documented AI strategy aligned with business objectives?',
        description: 'A formal strategy document ensures AI investments are directed toward measurable business outcomes rather than ad-hoc experimentation.',
        type: 'likert',
        required: true,
      },
      {
        id: 'strategy_2',
        text: 'To what extent does executive leadership actively champion and resource AI initiatives?',
        description: 'Executive sponsorship is critical for securing budget, removing organizational barriers, and ensuring AI projects receive strategic priority.',
        type: 'likert',
        required: true,
      },
      {
        id: 'strategy_3',
        text: 'How well are AI use cases prioritized based on business value and feasibility?',
        description: 'Effective prioritization prevents resource dilution across too many projects and focuses effort on high-impact, achievable outcomes.',
        type: 'likert',
        required: true,
      },
      {
        id: 'strategy_4',
        text: 'Does your organization have a multi-year AI investment roadmap with defined milestones?',
        description: 'Long-term roadmaps signal commitment, enable phased capability building, and provide a framework for measuring progress over time.',
        type: 'likert',
        required: true,
      },
      {
        id: 'strategy_5',
        text: 'How effectively does your organization measure and communicate the ROI of AI initiatives?',
        description: 'ROI measurement validates continued investment, builds stakeholder confidence, and enables data-driven decisions about scaling or pivoting AI programs.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'data',
    name: 'Data & Infrastructure',
    shortName: 'Data',
    weight: 0.15,
    description: 'Evaluates data quality, accessibility, governance practices, and the technical infrastructure supporting AI workloads including compute, storage, and pipelines.',
    icon: 'Database',
    color: '#8b5cf6',
    questions: [
      {
        id: 'data_1',
        text: 'How would you rate the overall quality, consistency, and completeness of your organizational data?',
        description: 'Data quality is the single largest determinant of AI model performance. Poor data leads to unreliable outputs and eroded trust.',
        type: 'likert',
        required: true,
      },
      {
        id: 'data_2',
        text: 'To what extent is your data accessible across departments in standardized formats?',
        description: 'Siloed data prevents holistic analysis and model training. Standardized, accessible data accelerates AI development cycles.',
        type: 'likert',
        required: true,
      },
      {
        id: 'data_3',
        text: 'Does your organization have mature data governance policies covering lineage, ownership, and quality standards?',
        description: 'Governance ensures regulatory compliance, data provenance, and accountability — prerequisites for trustworthy AI systems.',
        type: 'likert',
        required: true,
      },
      {
        id: 'data_4',
        text: 'How mature is your data pipeline and ETL infrastructure for supporting AI/ML workloads?',
        description: 'Robust pipelines enable real-time or near-real-time data delivery, which is essential for production AI systems and model retraining.',
        type: 'likert',
        required: true,
      },
      {
        id: 'data_5',
        text: 'Does your infrastructure provide scalable compute and storage resources adequate for AI training and inference?',
        description: 'Insufficient infrastructure creates bottlenecks in model development and deployment, delaying time-to-value for AI initiatives.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'technology',
    name: 'Technology & Tools',
    shortName: 'Technology',
    weight: 0.12,
    description: 'Assesses the maturity of AI/ML platforms, model deployment infrastructure, MLOps practices, and the integration of AI tools into existing technology ecosystems.',
    icon: 'Cpu',
    color: '#06b6d4',
    questions: [
      {
        id: 'technology_1',
        text: 'How mature is your organization\'s AI/ML platform and tooling ecosystem?',
        description: 'A mature platform reduces friction in model development, enables collaboration, and provides standardized environments for experimentation and production.',
        type: 'likert',
        required: true,
      },
      {
        id: 'technology_2',
        text: 'To what extent does your organization practice MLOps (CI/CD for ML, model monitoring, automated retraining)?',
        description: 'MLOps ensures models remain performant in production, enables rapid iteration, and reduces the operational burden of maintaining AI systems at scale.',
        type: 'likert',
        required: true,
      },
      {
        id: 'technology_3',
        text: 'How effectively are AI models deployed, versioned, and monitored in production environments?',
        description: 'Production-grade model management prevents drift, ensures reproducibility, and provides audit trails required for compliance and governance.',
        type: 'likert',
        required: true,
      },
      {
        id: 'technology_4',
        text: 'How well integrated are AI capabilities with your existing business applications and workflows?',
        description: 'Isolated AI tools deliver limited value. Deep integration with business systems amplifies impact and ensures AI augments rather than disrupts workflows.',
        type: 'likert',
        required: true,
      },
      {
        id: 'technology_5',
        text: 'Does your organization effectively leverage cloud, edge, or hybrid infrastructure for AI workloads?',
        description: 'Flexible infrastructure deployment enables cost optimization, low-latency inference at the edge, and scalability for variable compute demands.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'talent',
    name: 'Talent & Skills',
    shortName: 'Talent',
    weight: 0.13,
    description: 'Measures AI workforce readiness including technical skills availability, hiring capability, upskilling programs, and organizational AI literacy across all levels.',
    icon: 'Users',
    color: '#f59e0b',
    questions: [
      {
        id: 'talent_1',
        text: 'Does your organization have sufficient AI/ML technical talent to execute current and planned initiatives?',
        description: 'Talent scarcity is the top barrier to AI adoption. Organizations must assess whether they can staff critical AI roles without external support.',
        type: 'likert',
        required: true,
      },
      {
        id: 'talent_2',
        text: 'How effective are your organization\'s AI upskilling and training programs for existing employees?',
        description: 'Upskilling existing staff is often more sustainable than hiring alone, and builds institutional knowledge that external hires cannot replicate.',
        type: 'likert',
        required: true,
      },
      {
        id: 'talent_3',
        text: 'How well can your organization attract and retain AI/ML specialists in a competitive market?',
        description: 'Retention challenges increase costs and delay projects. A compelling employer brand and career path for AI professionals is essential.',
        type: 'likert',
        required: true,
      },
      {
        id: 'talent_4',
        text: 'To what extent do non-technical teams have AI literacy sufficient to collaborate on AI initiatives?',
        description: 'AI success requires cross-functional collaboration. Business teams must understand AI capabilities and limitations to define effective use cases.',
        type: 'likert',
        required: true,
      },
      {
        id: 'talent_5',
        text: 'Does your organization have defined AI career paths, role frameworks, and communities of practice?',
        description: 'Structured career development increases retention, standardizes skill expectations, and fosters knowledge sharing across the organization.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'governance',
    name: 'Governance & Ethics',
    shortName: 'Governance',
    weight: 0.15,
    description: 'Evaluates the existence and maturity of AI governance frameworks, ethical guidelines, bias detection practices, transparency requirements, and accountability structures.',
    icon: 'Shield',
    color: '#ef4444',
    questions: [
      {
        id: 'governance_1',
        text: 'Does your organization have a formal AI governance framework with clear accountability structures?',
        description: 'Governance frameworks define who is responsible for AI decisions, ensure oversight, and create escalation paths for high-risk AI applications.',
        type: 'likert',
        required: true,
      },
      {
        id: 'governance_2',
        text: 'How mature are your organization\'s practices for detecting and mitigating AI bias and fairness issues?',
        description: 'Bias in AI systems can cause discriminatory outcomes and legal exposure. Proactive detection and mitigation are essential for responsible deployment.',
        type: 'likert',
        required: true,
      },
      {
        id: 'governance_3',
        text: 'To what extent does your organization ensure AI transparency and explainability for stakeholders?',
        description: 'Transparency builds trust with users, regulators, and internal stakeholders. Explainability is increasingly required for high-stakes AI decisions.',
        type: 'likert',
        required: true,
      },
      {
        id: 'governance_4',
        text: 'Are there established processes for AI risk assessment, impact evaluation, and incident response?',
        description: 'Risk assessment identifies potential harms before deployment. Incident response ensures swift remediation when AI systems behave unexpectedly.',
        type: 'likert',
        required: true,
      },
      {
        id: 'governance_5',
        text: 'How well does your organization comply with relevant AI regulations and industry standards?',
        description: 'Regulatory compliance is non-negotiable. Proactive alignment with emerging regulations reduces legal risk and positions the organization as a trusted AI operator.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'culture',
    name: 'Culture & Change Management',
    shortName: 'Culture',
    weight: 0.10,
    description: 'Measures organizational readiness for AI-driven change including innovation culture, cross-functional collaboration, change management maturity, and employee receptiveness.',
    icon: 'Heart',
    color: '#ec4899',
    questions: [
      {
        id: 'culture_1',
        text: 'How strongly does your organizational culture support experimentation, learning from failure, and innovation?',
        description: 'AI adoption requires tolerance for iteration and failure. Cultures that punish experimentation will struggle to develop effective AI capabilities.',
        type: 'likert',
        required: true,
      },
      {
        id: 'culture_2',
        text: 'To what extent do cross-functional teams collaborate effectively on AI initiatives?',
        description: 'AI projects span data, engineering, product, and business functions. Siloed teams produce misaligned solutions that fail to deliver value.',
        type: 'likert',
        required: true,
      },
      {
        id: 'culture_3',
        text: 'How effectively does your organization manage change associated with AI-driven process transformation?',
        description: 'Change management determines whether AI tools are adopted or resisted. Without structured change management, even excellent AI solutions will be underutilized.',
        type: 'likert',
        required: true,
      },
      {
        id: 'culture_4',
        text: 'How receptive are employees at all levels to AI augmentation of their roles?',
        description: 'Employee receptiveness affects adoption rates. Fear-based resistance can derail implementations, while engaged employees accelerate value realization.',
        type: 'likert',
        required: true,
      },
      {
        id: 'culture_5',
        text: 'Does leadership communicate a clear and inspiring vision for how AI will benefit the organization and its people?',
        description: 'Clear communication reduces uncertainty, builds buy-in, and helps employees understand how AI enhances rather than threatens their contributions.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'process',
    name: 'Process & Operations',
    shortName: 'Process',
    weight: 0.10,
    description: 'Assesses the maturity of process automation, operational integration of AI, performance measurement, and continuous improvement practices for AI-powered workflows.',
    icon: 'Settings',
    color: '#14b8a6',
    questions: [
      {
        id: 'process_1',
        text: 'To what extent has your organization identified and prioritized processes suitable for AI automation?',
        description: 'Not all processes benefit from AI. Systematic identification and prioritization ensures automation efforts focus on high-ROI opportunities.',
        type: 'likert',
        required: true,
      },
      {
        id: 'process_2',
        text: 'How effectively are AI models integrated into operational workflows with human-in-the-loop where needed?',
        description: 'Human-in-the-loop design balances efficiency with safety, ensuring critical decisions receive human oversight while automating routine tasks.',
        type: 'likert',
        required: true,
      },
      {
        id: 'process_3',
        text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered process performance?',
        description: 'Without measurable outcomes, it is impossible to determine whether AI integration improves or degrades process performance.',
        type: 'likert',
        required: true,
      },
      {
        id: 'process_4',
        text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven processes?',
        description: 'AI systems degrade over time due to data drift. Continuous improvement cycles ensure models and processes remain effective.',
        type: 'likert',
        required: true,
      },
      {
        id: 'process_5',
        text: 'To what extent are operational teams equipped and empowered to manage AI systems day-to-day?',
        description: 'Operational ownership ensures AI systems are maintained, monitored, and improved by the teams closest to the business context.',
        type: 'likert',
        required: true,
      },
    ],
  },
  {
    id: 'security',
    name: 'Security & Compliance',
    shortName: 'Security',
    weight: 0.10,
    description: 'Evaluates AI-specific security practices, data privacy protections, regulatory compliance posture, and the robustness of controls for adversarial and misuse scenarios.',
    icon: 'Lock',
    color: '#64748b',
    questions: [
      {
        id: 'security_1',
        text: 'How mature are your organization\'s AI-specific security controls (adversarial robustness, model protection)?',
        description: 'AI systems introduce new attack surfaces including model extraction, adversarial inputs, and prompt injection. Dedicated controls are essential.',
        type: 'likert',
        required: true,
      },
      {
        id: 'security_2',
        text: 'How effectively does your organization protect data privacy in AI training and inference processes?',
        description: 'AI models can memorize and leak training data. Privacy-preserving techniques and data handling protocols are critical for compliance.',
        type: 'likert',
        required: true,
      },
      {
        id: 'security_3',
        text: 'To what extent does your organization conduct regular AI security audits and vulnerability assessments?',
        description: 'Regular audits identify emerging threats, verify control effectiveness, and ensure compliance with evolving security standards.',
        type: 'likert',
        required: true,
      },
      {
        id: 'security_4',
        text: 'Does your organization have robust access controls and audit trails for AI systems and data?',
        description: 'Access controls limit the blast radius of breaches, and audit trails provide accountability and support forensic investigations.',
        type: 'likert',
        required: true,
      },
      {
        id: 'security_5',
        text: 'How well prepared is your organization for AI-related regulatory requirements (e.g., EU AI Act, NIST AI RMF)?',
        description: 'Regulatory readiness reduces legal risk and positions the organization as a responsible AI operator in regulated markets.',
        type: 'likert',
        required: true,
      },
    ],
  },
];

// Derived constants
export const TOTAL_WEIGHT = PILLARS.reduce((sum, p) => sum + p.weight, 0);
export const QUESTIONS_PER_PILLAR = 5;
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;
export const MAX_PILLAR_RAW = QUESTIONS_PER_PILLAR * LIKERT_MAX; // 25
export const MIN_PILLAR_RAW = QUESTIONS_PER_PILLAR * LIKERT_MIN; // 5
export const SCORING_VERSION = '5.3';
export const METHODOLOGY_VERSION = '5.3';

export function getPillarById(id: string): PillarDefinition | undefined {
  return PILLARS.find(p => p.id === id);
}

export function getAllQuestionIds(): string[] {
  return PILLARS.flatMap(p => p.questions.map(q => q.id));
}

export const LIKERT_LABELS: Record<number, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};
