'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Brain,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  Target,
  GraduationCap,
  BarChart3,
  Sparkles,
  ArrowRight,
  Users,
  Lightbulb,
  RotateCcw,
  Loader2,
  Database,
  Crown,
  Landmark,
  Heart,
  FileText,
  Cpu,
  ExternalLink,
  Globe,
  Shield,
  AlertTriangle,
  Play,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

/* ─── Animation Helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Quiz Data ────────────────────────────────────────────────────────── */

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  questions: QuizQuestion[];
}

const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'fundamentals',
    title: 'AI Fundamentals',
    description: 'Core concepts of artificial intelligence, machine learning, and their capabilities.',
    icon: Brain,
    color: '#3b82f6',
    questions: [
      {
        id: 'f1',
        question: 'What is the primary difference between narrow AI and general AI?',
        options: [
          'Narrow AI requires less data than general AI',
          'Narrow AI is designed for specific tasks, while general AI can perform any intellectual task a human can',
          'General AI is smaller in scale than narrow AI',
          'Narrow AI is only used in robotics',
        ],
        correctIndex: 1,
        explanation: 'Narrow AI (also called weak AI) is designed and trained for specific tasks like image recognition or language translation. General AI (strong AI) would possess the ability to understand, learn, and apply intelligence across any cognitive task at human level — something that does not yet exist.',
      },
      {
        id: 'f2',
        question: 'What is the "black box" problem in AI?',
        options: [
          'AI models that are physically enclosed in secure hardware',
          'The difficulty in understanding how a model arrives at its decisions',
          'AI systems that operate without any data input',
          'The encryption used to protect AI model weights',
        ],
        correctIndex: 1,
        explanation: 'The "black box" problem refers to the inability to fully understand or explain the internal decision-making processes of complex AI models, particularly deep neural networks. This creates challenges for trust, accountability, and regulatory compliance in high-stakes applications.',
      },
      {
        id: 'f3',
        question: 'Which statement best describes machine learning?',
        options: [
          'Computers that are programmed with explicit rules for every scenario',
          'A subset of AI where systems learn patterns from data rather than being explicitly programmed',
          'Hardware acceleration for running complex calculations',
          'A method for storing large datasets efficiently',
        ],
        correctIndex: 1,
        explanation: 'Machine learning is a subset of AI where algorithms improve through experience and data rather than through explicit rule-based programming. The system identifies patterns in training data and uses them to make predictions or decisions on new, unseen data.',
      },
      {
        id: 'f4',
        question: 'What is the primary risk of deploying an AI model without bias auditing?',
        options: [
          'The model will run slower in production',
          'The model may produce systematically unfair outcomes for certain demographic groups',
          'The model will use too much memory',
          'The model will refuse to make predictions',
        ],
        correctIndex: 1,
        explanation: 'AI models trained on biased historical data can perpetuate and amplify those biases, leading to discriminatory outcomes in areas like hiring, lending, and healthcare. Bias auditing is essential to identify and mitigate these risks before deployment.',
      },
      {
        id: 'f5',
        question: 'What does "transfer learning" mean in the context of AI?',
        options: [
          'Moving AI models from one server to another',
          'Transferring data between different cloud providers',
          'Using knowledge gained from one task to improve performance on a different but related task',
          'Converting an AI model from one programming language to another',
        ],
        correctIndex: 2,
        explanation: 'Transfer learning allows a model trained on one task to leverage that knowledge when learning a new, related task. This dramatically reduces the amount of training data and compute needed, making AI development more efficient and accessible.',
      },
      {
        id: 'f6',
        question: 'What is the key distinction between supervised and unsupervised learning?',
        options: [
          'Supervised learning requires more powerful hardware',
          'Supervised learning uses labeled training data, while unsupervised learning finds patterns in unlabeled data',
          'Unsupervised learning is always more accurate',
          'Supervised learning can only process images',
        ],
        correctIndex: 1,
        explanation: 'In supervised learning, the model learns from labeled examples (input-output pairs), learning to map inputs to known outputs. In unsupervised learning, the model finds hidden patterns and structures in data without labeled examples, useful for clustering and anomaly detection.',
      },
    ],
  },
  {
    id: 'practice',
    title: 'AI in Practice',
    description: 'Real-world applications, MLOps, and deploying AI systems responsibly in enterprise settings.',
    icon: Target,
    color: '#8b5cf6',
    questions: [
      {
        id: 'p1',
        question: 'What is the most common reason enterprise AI projects fail to move from pilot to production?',
        options: [
          'Insufficient computing power',
          'Lack of alignment between AI initiatives and business objectives',
          'Using open-source frameworks instead of proprietary ones',
          'Having too many data scientists on the team',
        ],
        correctIndex: 1,
        explanation: 'Research consistently shows that the primary reason AI projects stall is misalignment with business strategy. Without clear business objectives, executive sponsorship, and measurable success criteria, AI pilots remain experiments rather than value-generating production systems.',
      },
      {
        id: 'p2',
        question: 'What is "data drift" in the context of production AI systems?',
        options: [
          'Data moving between different cloud regions',
          'Changes in the statistical properties of input data over time that can degrade model performance',
          'The process of migrating from on-premise to cloud data storage',
          'Data being accidentally deleted from training sets',
        ],
        correctIndex: 1,
        explanation: 'Data drift occurs when the distribution of data in production differs from the data the model was trained on. This can happen due to changing market conditions, user behavior shifts, or seasonal variations, and requires monitoring and retraining strategies to maintain model accuracy.',
      },
      {
        id: 'p3',
        question: 'What is MLOps and why is it important for enterprise AI?',
        options: [
          'A marketing term for selling AI products',
          'A set of practices combining machine learning, DevOps, and data engineering to deploy and maintain ML models in production reliably',
          'A specific software product for managing AI models',
          'An alternative to traditional software development',
        ],
        correctIndex: 1,
        explanation: 'MLOps (Machine Learning Operations) applies DevOps principles to ML workloads, including version control for data and models, automated testing, continuous integration/deployment, monitoring, and automated retraining. Without MLOps, organizations struggle to scale AI beyond individual experiments.',
      },
      {
        id: 'p4',
        question: 'What is a "human-in-the-loop" AI system?',
        options: [
          'An AI that requires human intervention for every single decision',
          'A system where human oversight is integrated into the AI decision-making process, especially for high-stakes decisions',
          'An AI that can only be used by one person at a time',
          'A system where humans write all the AI code manually',
        ],
        correctIndex: 1,
        explanation: 'Human-in-the-loop (HITL) systems integrate human judgment into the AI pipeline, allowing humans to review, override, or validate AI decisions — particularly important in high-stakes domains like healthcare, finance, and legal where automated decisions carry significant consequences.',
      },
      {
        id: 'p5',
        question: 'Which approach best ensures responsible AI deployment at scale?',
        options: [
          'Deploy first, fix issues when they arise in production',
          'Establish a governance framework with risk assessment, bias testing, and monitoring before and after deployment',
          'Only use AI for internal tools, never customer-facing applications',
          'Rely solely on the AI vendor to ensure ethical use',
        ],
        correctIndex: 1,
        explanation: 'Responsible AI at scale requires proactive governance: pre-deployment risk assessment and bias testing, continuous monitoring in production, clear accountability structures, and incident response procedures. Reactive approaches lead to costly failures and erosion of stakeholder trust.',
      },
    ],
  },
  {
    id: 'ethics',
    title: 'AI Ethics & Governance',
    description: 'Regulatory frameworks, ethical principles, and governance structures for AI accountability.',
    icon: BookOpen,
    color: '#06b6d4',
    questions: [
      {
        id: 'e1',
        question: 'Under the EU AI Act, which category carries the highest regulatory burden?',
        options: [
          'Minimal risk AI systems',
          'Limited risk AI systems',
          'High-risk AI systems such as biometric identification and critical infrastructure',
          'General-purpose AI models',
        ],
        correctIndex: 2,
        explanation: 'The EU AI Act classifies AI systems into risk tiers. High-risk AI systems — including those used in critical infrastructure, law enforcement, and biometric identification — face the strictest requirements: conformity assessments, risk management systems, data governance, transparency, and human oversight obligations.',
      },
      {
        id: 'e2',
        question: 'What is "algorithmic accountability"?',
        options: [
          'Making sure algorithms are written efficiently',
          'The principle that organizations must be responsible for the outcomes of their AI systems and able to explain how decisions are made',
          'Ensuring algorithms are patented and protected',
          'A technical requirement that all algorithms use the same programming language',
        ],
        correctIndex: 1,
        explanation: 'Algorithmic accountability means organizations deploying AI must take responsibility for system outcomes, maintain the ability to explain how decisions are reached, and have processes for addressing harmful or discriminatory results. It is a cornerstone of responsible AI governance.',
      },
      {
        id: 'e3',
        question: 'What is the purpose of an "AI impact assessment"?',
        options: [
          'To calculate the financial ROI of an AI project',
          'To systematically evaluate the potential social, ethical, and legal impacts of an AI system before deployment',
          'To measure how fast the AI model processes data',
          'To determine which programming framework to use',
        ],
        correctIndex: 1,
        explanation: 'AI impact assessments proactively identify potential harms — including discrimination, privacy violations, safety risks, and societal impacts — before deployment. They are increasingly required by regulation and represent a best practice for responsible AI development.',
      },
      {
        id: 'e4',
        question: 'What does "explainability" mean in the context of AI governance?',
        options: [
          'Making the source code of AI models publicly available',
          'The ability to provide understandable explanations of how AI systems arrive at their decisions or predictions',
          'Writing documentation for software engineers',
          'Explaining why the organization chose to invest in AI',
        ],
        correctIndex: 1,
        explanation: 'Explainability (or interpretability) refers to the degree to which a human can understand the cause of a decision made by an AI system. It is critical for regulatory compliance (e.g., GDPR\'s "right to explanation"), building user trust, and enabling effective human oversight of AI systems.',
      },
      {
        id: 'e5',
        question: 'What is "model bias amplification"?',
        options: [
          'When a model becomes more accurate over time',
          'When an AI system not only reflects existing biases in training data but reinforces and exaggerates them through its outputs and feedback loops',
          'When a model is trained on too much data',
          'When bias detection tools flag too many issues',
        ],
        correctIndex: 1,
        explanation: 'Bias amplification occurs when an AI system reinforces and magnifies existing societal biases through a feedback loop: biased outputs influence future data collection, which trains even more biased models. This makes early bias detection and mitigation critical before deployment.',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data & Infrastructure',
    description: 'Data quality, pipelines, governance, and infrastructure readiness for AI workloads.',
    icon: Database,
    color: '#14b8a6',
    questions: [
      {
        id: 'd1',
        question: 'What is the primary purpose of a feature store in ML operations?',
        options: [
          'Storing raw data in its original format',
          'Centralizing and serving ML features for consistent training and inference',
          'Backing up machine learning model weights',
          'Managing user authentication for ML platforms',
        ],
        correctIndex: 1,
        explanation: 'A feature store centralizes feature engineering by providing a shared repository where ML features are computed, stored, and served consistently across training and inference pipelines. This eliminates feature duplication, ensures consistency between training and production, and accelerates model development.',
      },
      {
        id: 'd2',
        question: 'What is the critical difference between data quality for analytics versus data quality for AI/ML?',
        options: [
          'There is no significant difference — data quality standards are the same',
          'AI/ML requires not only accurate data but also representative, unbiased, and temporally consistent data for model training',
          'Analytics requires higher data quality than AI',
          'AI only needs large volumes of data, quality is secondary',
        ],
        correctIndex: 1,
        explanation: 'While analytics needs accurate and consistent data, AI/ML imposes additional requirements: data must be representative of the target population, free from historical biases that could be amplified, and temporally consistent to avoid training-serving skew. A dataset that is perfectly valid for analytics could produce a dangerously biased AI model.',
      },
      {
        id: 'd3',
        question: 'What is "data governance" in the context of AI readiness?',
        options: [
          'Only controlling who can access databases',
          'A framework of policies, standards, and processes that ensure data quality, privacy, lineage, and compliance throughout the AI lifecycle',
          'The physical security of data centers',
          'A method for compressing large datasets',
        ],
        correctIndex: 1,
        explanation: 'AI data governance encompasses the policies and processes that ensure data quality, privacy protection, regulatory compliance (GDPR, CCPA), lineage tracking, and access control throughout the entire AI lifecycle — from data collection and labeling through model training, deployment, and monitoring.',
      },
      {
        id: 'd4',
        question: 'Why is "data drift" particularly dangerous for AI systems compared to traditional software?',
        options: [
          'It only affects cloud-based systems',
          'Traditional software has deterministic logic, while AI models silently degrade in accuracy when input data distributions shift from training conditions',
          'Data drift only occurs in supervised learning',
          'It is easily detected by standard monitoring tools',
        ],
        correctIndex: 1,
        explanation: 'Traditional software follows deterministic rules that produce the same output for the same input. AI models, however, make predictions based on statistical patterns learned from training data. When production data drifts from training distributions, model accuracy silently degrades without obvious errors — making drift detection and monitoring critical for AI operations.',
      },
      {
        id: 'd5',
        question: 'What is the role of data labeling in AI readiness?',
        options: [
          'It is only needed for unsupervised learning',
          'High-quality labeled data is essential for supervised learning, and labeling consistency directly impacts model performance and reliability',
          'Data labeling is fully automated and requires no human oversight',
          'Labels are only needed during model deployment, not training',
        ],
        correctIndex: 1,
        explanation: 'For supervised learning, the quality of labeled training data directly determines model performance. Inconsistent, biased, or noisy labels propagate through the training process and produce unreliable models. Data labeling strategies — including human annotation, active learning, and quality assurance processes — are fundamental to AI readiness.',
      },
    ],
  },
  {
    id: 'strategy',
    title: 'AI Strategy & Leadership',
    description: 'Strategic alignment, investment prioritization, organizational readiness, and executive decision-making for AI transformation.',
    icon: Crown,
    color: '#d4a853',
    questions: [
      {
        id: 's1',
        question: 'What is the most common strategic mistake organizations make when starting their AI journey?',
        options: [
          'Investing too much in data infrastructure before building models',
          'Pursuing AI projects without a clear alignment to business objectives and measurable success criteria',
          'Starting with small pilot projects instead of enterprise-wide deployment',
          'Hiring too many data scientists at once',
        ],
        correctIndex: 1,
        explanation: 'The most common strategic failure is pursuing AI for its own sake without clear business alignment. Organizations that start with technology rather than business problems end up with disconnected pilot projects that fail to deliver measurable value. Successful AI strategies begin with identifying high-impact business problems that AI can uniquely solve.',
      },
      {
        id: 's2',
        question: 'What does "AI governance" mean at the executive level?',
        options: [
          'IT department policies for server management',
          'A cross-functional framework of policies, accountability structures, and oversight processes that ensure AI systems are ethical, compliant, and aligned with organizational values',
          'Only compliance with data privacy regulations',
          'Delegating all AI decisions to the data science team',
        ],
        correctIndex: 1,
        explanation: 'Executive AI governance goes beyond technical compliance. It establishes cross-functional accountability, risk management frameworks, ethical guidelines, investment oversight, and performance measurement that ensures AI initiatives deliver value while managing organizational risk. It requires board-level engagement and cross-functional representation.',
      },
      {
        id: 's3',
        question: 'How should organizations measure the ROI of AI investments?',
        options: [
          'Only by counting the number of AI models deployed',
          'Through a combination of direct financial returns, operational efficiency gains, strategic optionality, and risk reduction — measured against total cost of ownership',
          'AI ROI cannot be measured reliably',
          'Only by comparing to competitor spending on AI',
        ],
        correctIndex: 1,
        explanation: 'AI ROI requires a multi-dimensional measurement approach: direct financial returns (revenue, cost savings), operational efficiency (cycle time, quality), strategic optionality (new capabilities, market positioning), and risk reduction (compliance, safety). Total cost of ownership must include talent, infrastructure, governance, and ongoing operational costs.',
      },
      {
        id: 's4',
        question: 'What is the recommended approach for scaling AI from pilot to production?',
        options: [
          'Deploy all pilots to production simultaneously for maximum impact',
          'Establish a structured progression: validate business value in pilot, build MLOps foundation, then scale proven use cases with dedicated teams and monitoring',
          'Wait until all AI technologies are mature before deploying anything',
          'Scale only the cheapest AI projects regardless of business value',
        ],
        correctIndex: 1,
        explanation: 'Successful AI scaling follows a structured progression: first validate business value and technical feasibility through focused pilots, then invest in MLOps infrastructure and operational processes, and finally scale proven use cases with dedicated teams, monitoring, and governance. Attempting to skip steps leads to unreliable production systems and wasted investment.',
      },
      {
        id: 's5',
        question: 'What is the primary purpose of an AI Center of Excellence (CoE)?',
        options: [
          'Centralizing all AI development in a single team',
          'Establishing organizational standards, best practices, training, and governance that enable consistent and responsible AI adoption across all business units',
          'Replacing all existing IT departments with AI specialists',
          'Only managing vendor relationships for AI tools',
        ],
        correctIndex: 1,
        explanation: 'An AI Center of Excellence serves as the organizational hub for AI standards, best practices, governance frameworks, and capability building. Rather than centralizing all AI work, it enables distributed teams to adopt AI consistently and responsibly by providing shared tooling, templates, training, and governance oversight.',
      },
    ],
  },
];

/* ─── Department AI IQ Data ──────────────────────────────────────────── */

const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#3b82f6',
  'Data Science': '#8b5cf6',
  Product: '#06b6d4',
  Marketing: '#f59e0b',
  Finance: '#14b8a6',
  Operations: '#ec4899',
  HR: '#ef4444',
  Legal: '#64748b',
  Sales: '#a78bfa',
  'Customer Support': '#f472b6',
}

interface DepartmentIQ {
  name: string
  score: number
  color: string
  respondents: number
  insights: string
}

const FALLBACK_DEPARTMENT_DATA: DepartmentIQ[] = [
  { name: 'Engineering', score: 78, color: '#3b82f6', respondents: 142, insights: 'Strong technical foundation but gaps in AI ethics awareness' },
  { name: 'Data Science', score: 85, color: '#8b5cf6', respondents: 38, insights: 'Highest literacy — serves as internal AI champions' },
  { name: 'Product', score: 62, color: '#06b6d4', respondents: 56, insights: 'Good conceptual understanding, needs production ML knowledge' },
  { name: 'Marketing', score: 45, color: '#f59e0b', respondents: 89, insights: 'Familiar with AI tools but lacks governance knowledge' },
  { name: 'Finance', score: 52, color: '#14b8a6', respondents: 67, insights: 'Risk-aware but limited hands-on AI deployment experience' },
  { name: 'Operations', score: 38, color: '#ec4899', respondents: 73, insights: 'Process automation awareness but weak on strategic AI alignment' },
  { name: 'HR', score: 42, color: '#ef4444', respondents: 45, insights: 'Understands AI hiring risks but lacks technical depth' },
  { name: 'Legal', score: 35, color: '#64748b', respondents: 28, insights: 'Strong on compliance but limited AI system understanding' },
];

/* ─── Learning Modules ─────────────────────────────────────────────────── */

const LEARNING_MODULES = [
  {
    id: 'lm1',
    title: 'AI Foundations for Business Leaders',
    level: 'Beginner',
    duration: '4 hours',
    topics: ['What AI can and cannot do', 'Identifying AI use cases', 'Building an AI strategy'],
    color: '#3b82f6',
  },
  {
    id: 'lm2',
    title: 'Data Literacy for AI Readiness',
    level: 'Beginner',
    duration: '3 hours',
    topics: ['Data quality essentials', 'Understanding data pipelines', 'Data governance basics'],
    color: '#8b5cf6',
  },
  {
    id: 'lm3',
    title: 'AI Ethics & Responsible Innovation',
    level: 'Intermediate',
    duration: '5 hours',
    topics: ['Bias detection & mitigation', 'Transparency requirements', 'Impact assessment methods'],
    color: '#06b6d4',
  },
  {
    id: 'lm4',
    title: 'MLOps & AI Production Management',
    level: 'Intermediate',
    duration: '6 hours',
    topics: ['Model deployment pipelines', 'Monitoring & drift detection', 'Automated retraining'],
    color: '#14b8a6',
  },
  {
    id: 'lm5',
    title: 'AI Governance Framework Design',
    level: 'Advanced',
    duration: '8 hours',
    topics: ['EU AI Act compliance', 'Risk classification systems', 'Accountability structures'],
    color: '#f59e0b',
  },
  {
    id: 'lm6',
    title: 'Organizational AI Change Management',
    level: 'Advanced',
    duration: '5 hours',
    topics: ['Stakeholder engagement', 'Resistance management', 'Measuring adoption metrics'],
    color: '#ec4899',
  },
];

/* ─── Quiz Component ───────────────────────────────────────────────────── */

function QuizEngine({ category, onComplete }: { category: QuizCategory; onComplete: (score: number, total: number) => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const question = category.questions[currentQ];
  const isCorrect = selected === question.correctIndex;

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setShowExplanation(true);
    if (index === question.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < category.questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      onComplete(correctCount + (isCorrect ? 0 : 0), category.questions.length);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground">
          {currentQ + 1}/{category.questions.length}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-navy-700/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: category.color }}
            animate={{ width: `${((currentQ + 1) / category.questions.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {correctCount} correct
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="font-heading text-xl font-semibold text-foreground mb-8">
            {question.question}
          </h3>

          <div className="space-y-3">
            {question.options.map((option, i) => {
              const isSelected = selected === i;
              const isCorrectOption = i === question.correctIndex;
              let optionStyle = 'border-transparent bg-navy-800/50 hover:bg-navy-700/50';

              if (selected !== null) {
                if (isCorrectOption) {
                  optionStyle = 'border-emerald-500/50 bg-emerald-500/8';
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = 'border-red-500/50 bg-red-500/8';
                } else {
                  optionStyle = 'border-transparent bg-navy-800/25 opacity-50';
                }
              }

              return (
                <motion.button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${optionStyle} ${selected === null ? 'cursor-pointer' : 'cursor-default'}`}
                  whileHover={selected === null ? { scale: 1.005 } : undefined}
                  whileTap={selected === null ? { scale: 0.995 } : undefined}
                  disabled={selected !== null}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono mt-0.5"
                      style={{
                        backgroundColor: selected !== null && isCorrectOption ? '#22c55e20' : isSelected && !isCorrectOption ? '#ef444420' : '#ffffff08',
                        color: selected !== null && isCorrectOption ? '#22c55e' : isSelected && !isCorrectOption ? '#ef4444' : '#64748b',
                      }}
                    >
                      {selected !== null && isCorrectOption ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isSelected && !isCorrectOption ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    <span className="text-sm font-sans text-foreground leading-relaxed">{option}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <div className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-500/5' : 'bg-amber-500/5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-400" />
                    )}
                    <span className={`font-heading text-sm font-semibold ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isCorrect ? 'Correct!' : 'Not quite — see explanation below'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      {selected !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Button
            onClick={handleNext}
            className="font-heading font-semibold bg-eari-blue hover:bg-eari-blue-dark text-white"
          >
            {currentQ < category.questions.length - 1 ? 'Next Question' : 'See Results'}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Quiz Results ─────────────────────────────────────────────────────── */

function QuizResults({ category, score, total, onRetry }: { category: QuizCategory; score: number; total: number; onRetry: () => void }) {
  const percentage = Math.round((score / total) * 100);
  const grade = percentage >= 80 ? 'Expert' : percentage >= 60 ? 'Proficient' : percentage >= 40 ? 'Developing' : 'Beginner';
  const gradeColor = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#3b82f6' : percentage >= 40 ? '#f59e0b' : '#ef4444';

  const recommendedModules = LEARNING_MODULES.filter((m) => {
    if (percentage < 40) return m.level === 'Beginner';
    if (percentage < 60) return m.level === 'Beginner' || m.level === 'Intermediate';
    if (percentage < 80) return m.level === 'Intermediate' || m.level === 'Advanced';
    return m.level === 'Advanced';
  }).slice(0, 3);

  const [aiPath, setAiPath] = useState<{
    overallLevel: string;
    summary: string;
    recommendedPath: { order: number; title: string; description: string; duration: string; priority: string; topics: string[] }[];
    strengths: string[];
    gaps: string[];
    nextMilestone: string;
    isAIGenerated: boolean;
  } | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);

  useEffect(() => {
    const fetchPath = async () => {
      setIsLoadingPath(true);
      try {
        const res = await fetch('/api/literacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizScores: { [category.id]: { score, total } },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiPath(data);
        }
      } catch {
        // AI path generation failed — static recommendations still shown
      } finally {
        setIsLoadingPath(false);
      }
    };
    fetchPath();
  }, [category.id, score, total]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-10"
    >
      {/* Score Summary - Clean, open layout */}
      <div className="flex flex-col sm:flex-row items-center gap-8 py-6">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(48,57,74,0.3)" strokeWidth="7" />
            <motion.circle
              cx="70" cy="70" r="58" fill="none"
              stroke={gradeColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={364}
              initial={{ strokeDashoffset: 364 }}
              animate={{ strokeDashoffset: 364 - 364 * (percentage / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="62" textAnchor="middle" fill="#e6edf3" fontSize="32" fontWeight="700" fontFamily="var(--font-plus-jakarta)">
              {percentage}
            </text>
            <text x="70" y="84" textAnchor="middle" fill="#8b949e" fontSize="12" fontFamily="var(--font-inter)">
              percent
            </text>
          </svg>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="font-heading text-2xl font-bold text-foreground">
            {category.title}
          </h3>
          <p className="text-muted-foreground font-sans mt-1">
            You scored {score} out of {total} correctly
          </p>
          <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
            <Badge style={{ backgroundColor: `${gradeColor}15`, color: gradeColor, border: `1px solid ${gradeColor}30` }}>
              <Trophy className="h-3 w-3 mr-1" />
              {grade} Level
            </Badge>
          </div>
        </div>
      </div>

      {/* AI-Powered Learning Path (priority over static) */}
      {(isLoadingPath || aiPath) && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-5 w-5 text-eari-blue-light" />
            <h3 className="font-heading text-lg font-semibold text-foreground">AI-Powered Learning Path</h3>
            {aiPath?.isAIGenerated && (
              <Badge variant="outline" className="text-[10px] font-mono border-eari-blue/40 text-eari-blue-light">
                AI-Generated
              </Badge>
            )}
          </div>
          {isLoadingPath ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-eari-blue-light" />
              <span className="text-sm text-muted-foreground font-sans">Generating your personalized learning path...</span>
            </div>
          ) : aiPath && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
              <div className="p-5 rounded-xl bg-navy-800/50">
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">{aiPath.summary}</p>
                <div className="flex gap-4 mt-3">
                  <div>
                    <span className="text-xs text-muted-foreground font-sans">Level:</span>
                    <Badge className="ml-1 text-xs" variant="outline" style={{ color: gradeColor, borderColor: `${gradeColor}40` }}>{aiPath.overallLevel}</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-sans">Next milestone:</span>
                    <span className="ml-1 text-xs text-foreground font-sans">{aiPath.nextMilestone}</span>
                  </div>
                </div>
              </div>

              {/* Path modules as a clean list */}
              <div className="space-y-3">
                {aiPath.recommendedPath.map((mod, i) => (
                  <FadeUp key={i} delay={i * 0.08}>
                    <div className="p-4 rounded-xl bg-navy-800/30 hover:bg-navy-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold" style={{ backgroundColor: `${mod.priority === 'critical' ? '#ef4444' : mod.priority === 'high' ? '#f59e0b' : '#3b82f6'}20`, color: mod.priority === 'critical' ? '#ef4444' : mod.priority === 'high' ? '#f59e0b' : '#3b82f6' }}>
                            {mod.order}
                          </span>
                          <h4 className="font-heading text-sm font-semibold text-foreground">{mod.title}</h4>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{mod.duration}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-sans leading-relaxed mb-2 ml-8">{mod.description}</p>
                      <div className="flex flex-wrap gap-2 ml-8">
                        {mod.topics.map((topic) => (
                          <span key={topic} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-sans bg-navy-700/50 px-2 py-0.5 rounded-full">
                            <div className="h-1 w-1 rounded-full bg-eari-blue-light" />
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>

              {aiPath.strengths?.length > 0 && (
                <div className="flex gap-8 mt-2 pt-4 border-t border-border/20">
                  <div>
                    <span className="text-xs font-heading font-semibold text-emerald-400">Strengths</span>
                    <ul className="mt-1.5 space-y-1">{aiPath.strengths.map(s => <li key={s} className="text-xs text-muted-foreground font-sans flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-400/60" />{s}</li>)}</ul>
                  </div>
                  <div>
                    <span className="text-xs font-heading font-semibold text-amber-400">Gaps</span>
                    <ul className="mt-1.5 space-y-1">{aiPath.gaps.map(g => <li key={g} className="text-xs text-muted-foreground font-sans flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-400/60" />{g}</li>)}</ul>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Static Recommended Learning (fallback / supplement) */}
      {!aiPath && !isLoadingPath && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <GraduationCap className="h-5 w-5 text-eari-blue-light" />
            <h3 className="font-heading text-lg font-semibold text-foreground">Recommended Next Steps</h3>
          </div>
          <div className="space-y-3">
            {recommendedModules.map((mod, i) => (
              <FadeUp key={mod.id} delay={i * 0.08}>
                <div className="p-4 rounded-xl bg-navy-800/30 hover:bg-navy-800/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold" style={{ backgroundColor: `${mod.color}20`, color: mod.color }}>
                      {i + 1}
                    </span>
                    <h4 className="font-heading text-sm font-semibold text-foreground">{mod.title}</h4>
                    <Badge variant="outline" className="text-[10px] font-mono ml-auto" style={{ color: mod.color, borderColor: `${mod.color}40` }}>
                      {mod.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{mod.duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-8">
                    {mod.topics.map((topic) => (
                      <span key={topic} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-sans bg-navy-700/50 px-2 py-0.5 rounded-full">
                        <div className="h-1 w-1 rounded-full" style={{ backgroundColor: mod.color }} />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border/20">
        <Button onClick={onRetry} variant="outline" className="border-border font-heading">
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry Quiz
        </Button>
        <Link href="/literacy/roles">
          <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading">
            View Role-Based Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LiteracyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue-light" />
        </main>
        <Footer />
      </div>
    }>
      <LiteracyPageContent />
    </Suspense>
  )
}

type LiteracyTab = 'quiz' | 'paths' | 'roles';

function LiteracyPageContent() {
  const searchParams = useSearchParams();
  const fromResults = searchParams.get('from') === 'results';
  const weakParam = searchParams.get('weak') || '';
  const focusParam = searchParams.get('focus') || '';
  const focusAreas = [...new Set([...weakParam.split(','), ...focusParam.split(',')].filter(Boolean))];

  const initialQuiz = fromResults && focusAreas.length > 0 && weakParam ? weakParam : null;

  const [activeTab, setActiveTab] = useState<LiteracyTab>('quiz');
  const [activeQuiz, setActiveQuiz] = useState<string | null>(initialQuiz);
  const [quizResult, setQuizResult] = useState<{ categoryId: string; score: number; total: number } | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<Record<string, { score: number; total: number; completedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('eari-literacy-progress');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const onCompleteQuiz = (categoryId: string, score: number, total: number) => {
    setQuizResult({ categoryId, score, total });
    const newCompleted = { ...completedQuizzes, [categoryId]: { score, total, completedAt: new Date().toISOString() } };
    setCompletedQuizzes(newCompleted);
    try { localStorage.setItem('eari-literacy-progress', JSON.stringify(newCompleted)); } catch {}
  };

  const activeCategory = QUIZ_CATEGORIES.find((c) => c.id === activeQuiz);

  const completedCount = Object.keys(completedQuizzes).length;
  const overallPct = completedCount > 0
    ? Math.round(Object.values(completedQuizzes).reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / completedCount)
    : 0;

  const tabs: { id: LiteracyTab; label: string; icon: React.ElementType }[] = [
    { id: 'quiz', label: 'Assess', icon: Brain },
    { id: 'paths', label: 'Learn', icon: GraduationCap },
    { id: 'roles', label: 'Roles', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          {/* ─── Hero Section ────────────────────────────────────────────── */}
          <FadeUp>
            <div className="text-center max-w-xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4 font-mono text-xs border-eari-blue/40 text-eari-blue-light">
                E-ARI Literacy
              </Badge>
              <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                <span className="text-eari-blue-light font-semibold">AI Literacy Hub</span>
              </h1>
              <p className="mt-4 text-muted-foreground font-sans leading-relaxed text-lg">
                Assess your AI knowledge, follow curated learning paths, and discover role-specific insights.
              </p>

              {/* Compact overall progress */}
              {completedCount > 0 && (
                <div className="mt-8 inline-flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-4 w-4 text-eari-blue-light" />
                    <span className="text-sm font-heading font-semibold text-eari-blue-light">
                      {overallPct}% Overall Score
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">
                      ({completedCount}/{QUIZ_CATEGORIES.length} completed)
                    </span>
                  </div>
                  <div className="w-48 h-1.5 rounded-full bg-navy-700/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-eari-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedCount / QUIZ_CATEGORIES.length) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </FadeUp>

          {/* ─── Tab Bar ──────────────────────────────────────────────────── */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-navy-800/60">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-heading text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-eari-blue text-white shadow-lg shadow-eari-blue/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-navy-700/40'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Tab Content ──────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {/* ────── Tab 1: Assess Your Knowledge ────── */}
            {activeTab === 'quiz' && (
              <motion.div
                key="quiz-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Progress strip (replaces 5 tiny circles) */}
                {completedCount > 0 && (
                  <FadeUp>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Your Progress</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground/40 hover:text-destructive font-sans text-xs h-6"
                        onClick={() => {
                          setCompletedQuizzes({});
                          try { localStorage.removeItem('eari-literacy-progress'); } catch {}
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                    <div className="flex gap-2 mb-8">
                      {QUIZ_CATEGORIES.map((cat) => {
                        const result = completedQuizzes[cat.id];
                        const pct = result ? Math.round((result.score / result.total) * 100) : 0;
                        const gradeColor = !result ? '#303949' : pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={cat.id} className="flex-1 group">
                            <div className="h-1.5 rounded-full overflow-hidden bg-navy-700/40 mb-1.5">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: gradeColor }}
                                initial={{ width: 0 }}
                                animate={{ width: result ? `${pct}%` : '0%' }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] font-heading font-medium text-muted-foreground/60 group-hover:text-muted-foreground transition-colors truncate block">
                              {cat.title.replace('AI ', '').replace('& ', '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </FadeUp>
                )}

                {/* Targeted Training Banner */}
                {fromResults && focusAreas.length > 0 && !dismissedBanner && !activeQuiz && (
                  <FadeUp>
                    <div className="p-5 rounded-xl bg-eari-blue/[0.06] border border-white/[0.06]">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eari-blue/15 flex-shrink-0">
                          <Target className="h-5 w-5 text-eari-blue-light" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-sm font-bold text-foreground mb-1">
                            Targeted Training Recommended
                          </h3>
                          <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-3">
                            Based on your assessment, focus on these areas:
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {focusAreas.map((quizId) => {
                              const cat = QUIZ_CATEGORIES.find(c => c.id === quizId);
                              if (!cat) return null;
                              return (
                                <Badge key={quizId} variant="outline" className="text-xs font-sans py-1 px-3" style={{ color: cat.color, borderColor: `${cat.color}30`, backgroundColor: `${cat.color}08` }}>
                                  {cat.title}
                                </Badge>
                              );
                            })}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { setActiveQuiz(weakParam || focusAreas[0]); setQuizResult(null); }}
                            className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading"
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Start with {QUIZ_CATEGORIES.find(c => c.id === (weakParam || focusAreas[0]))?.title || 'Weakest Area'}
                          </Button>
                        </div>
                        <button onClick={() => setDismissedBanner(true)} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 mt-1">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </FadeUp>
                )}

                {/* Quiz Category Selection or Active Quiz */}
                {!activeQuiz ? (
                  <div>
                    <h2 className="font-heading text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                      Choose a Knowledge Area
                    </h2>
                    <div className="space-y-2">
                      {(() => {
                        const sorted = [...QUIZ_CATEGORIES].sort((a, b) => {
                          const aFocus = focusAreas.includes(a.id) ? 0 : 1;
                          const bFocus = focusAreas.includes(b.id) ? 0 : 1;
                          return aFocus - bFocus;
                        });
                        return sorted.map((cat, i) => {
                          const isFocus = focusAreas.includes(cat.id);
                          const isWeakest = cat.id === weakParam;
                          const Icon = cat.icon;
                          const result = completedQuizzes[cat.id];
                          const pct = result ? Math.round((result.score / result.total) * 100) : null;
                          const gradeColor = pct !== null ? (pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444') : null;

                          return (
                            <FadeUp key={cat.id} delay={i * 0.04}>
                              <motion.button
                                onClick={() => { setActiveQuiz(cat.id); setQuizResult(null); }}
                                className={`w-full text-left p-4 rounded-xl transition-all group ${
                                  isWeakest
                                    ? 'bg-eari-blue/8 ring-1 ring-eari-blue/20 hover:bg-eari-blue/12'
                                    : isFocus
                                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                    : 'bg-navy-800/30 hover:bg-navy-800/50'
                                }`}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.998 }}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: `${cat.color}15` }}>
                                    <Icon className="h-5 w-5" style={{ color: cat.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-eari-blue-light transition-colors">
                                        {cat.title}
                                      </h3>
                                      {isWeakest && (
                                        <Badge className="bg-eari-blue/15 text-eari-blue-light border-eari-blue/25 text-[9px] h-4">
                                          <Target className="h-2.5 w-2.5 mr-0.5" />Weakest
                                        </Badge>
                                      )}
                                      {isFocus && !isWeakest && (
                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/25 text-[9px] h-4">
                                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Focus
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground font-sans mt-0.5 truncate">
                                      {cat.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs text-muted-foreground font-mono">{cat.questions.length}q</span>
                                    {result && gradeColor && (
                                      <span className="text-xs font-heading font-bold" style={{ color: gradeColor }}>{pct}%</span>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                                  </div>
                                </div>
                              </motion.button>
                            </FadeUp>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : quizResult && quizResult.categoryId === activeQuiz ? (
                  <div>
                    <button
                      onClick={() => { setActiveQuiz(null); setQuizResult(null); }}
                      className="text-muted-foreground hover:text-foreground font-sans text-sm mb-6 inline-flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      All Categories
                    </button>
                    <QuizResults
                      category={activeCategory!}
                      score={quizResult.score}
                      total={quizResult.total}
                      onRetry={() => { setQuizResult(null); setActiveQuiz(null); }}
                    />
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => { setActiveQuiz(null); setQuizResult(null); }}
                      className="text-muted-foreground hover:text-foreground font-sans text-sm mb-6 inline-flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      All Categories
                    </button>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${activeCategory!.color}15` }}>
                        {(() => { const Icon = activeCategory!.icon; return <Icon className="h-5 w-5" style={{ color: activeCategory!.color }} />; })()}
                      </div>
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        {activeCategory!.title}
                      </h2>
                    </div>
                    <QuizEngine
                      category={activeCategory!}
                      onComplete={(score, total) => onCompleteQuiz(activeQuiz!, score, total)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ────── Tab 2: Learning Paths (Timeline) ────── */}
            {activeTab === 'paths' && (
              <motion.div
                key="paths-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                <div className="text-center max-w-lg mx-auto mb-4">
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                    Structured Training Paths
                  </h2>
                  <p className="text-muted-foreground font-sans leading-relaxed">
                    Systematically build AI readiness from foundational knowledge to advanced governance.
                  </p>
                </div>

                {/* Timeline-style layout */}
                {[
                  { level: 'Beginner', title: 'Foundation Builder', color: '#22c55e', bg: 'bg-emerald-500/10', textColor: 'text-emerald-400', hoverBorder: 'hover:bg-emerald-500/5', totalHours: '~7 hours', step: 1 },
                  { level: 'Intermediate', title: 'Practitioner Accelerator', color: '#3b82f6', bg: 'bg-eari-blue/10', textColor: 'text-eari-blue-light', hoverBorder: 'hover:bg-eari-blue/5', totalHours: '~11 hours', step: 2 },
                  { level: 'Advanced', title: 'Leadership Mastery', color: '#f59e0b', bg: 'bg-amber-500/10', textColor: 'text-amber-400', hoverBorder: 'hover:bg-amber-500/5', totalHours: '~13 hours', step: 3 },
                ].map((tier, tierIdx) => (
                  <FadeUp key={tier.level} delay={tierIdx * 0.1}>
                    <div className="relative">
                      {/* Step indicator */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tier.bg}`}>
                          <span className={`font-heading text-sm font-extrabold ${tier.textColor}`}>{tier.step}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-lg font-bold text-foreground">{tier.title}</h3>
                            <Badge className={`${tier.bg} ${tier.textColor} border-0 text-[10px]`}>{tier.level}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{tier.totalHours}</span>
                        </div>
                      </div>

                      {/* Modules as compact list items */}
                      <div className="ml-[26px] pl-8 border-l border-border/20 space-y-2">
                        {LEARNING_MODULES.filter(m => m.level === tier.level).map(mod => (
                          <div key={mod.id} className={`p-4 rounded-xl bg-navy-800/25 ${tier.hoverBorder} transition-colors`}>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-heading text-sm font-semibold text-foreground">{mod.title}</h4>
                              <span className="text-xs text-muted-foreground font-mono ml-auto">{mod.duration}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {mod.topics.map((topic) => (
                                <span key={topic} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-sans bg-navy-700/40 px-2 py-0.5 rounded-full">
                                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: mod.color }} />
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Connector between tiers */}
                      {tierIdx < 2 && (
                        <div className="ml-[26px] w-px h-8 bg-border/15" />
                      )}
                    </div>
                  </FadeUp>
                ))}
              </motion.div>
            )}

            {/* ────── Tab 3: Role Insights ────── */}
            {activeTab === 'roles' && (
              <motion.div
                key="roles-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <div className="max-w-lg mx-auto text-center py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eari-blue/10 mx-auto mb-6">
                    <Users className="h-8 w-8 text-eari-blue-light" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
                    Role-Based AI Insights
                  </h2>
                  <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                    Discover tailored insights, competency benchmarks, and recommended focus areas for each role — from executives to engineers.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/literacy/roles">
                      <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-11 px-7">
                        Explore Role Insights
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-border font-heading h-11 px-7"
                      onClick={() => setActiveTab('quiz')}
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Take a Quiz First
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* ─── DEPARTMENT AI IQ ──────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <BarChart3 className="h-6 w-6 text-eari-blue-light" />
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                    Department AI IQ
                  </h2>
                </div>
                <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                  How does your organization&apos;s AI literacy compare across departments? This benchmark reveals where to focus upskilling investments for maximum readiness impact.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FALLBACK_DEPARTMENT_DATA.map((dept, i) => (
                <FadeUp key={dept.name} delay={i * 0.05}>
                  <div className="p-5 rounded-xl bg-navy-800/50 border border-navy-700/40 hover:border-navy-600/60 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-heading font-semibold text-foreground">{dept.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{dept.respondents} resp.</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-12 h-12">
                        <svg width="48" height="48" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(48,57,74,0.3)" strokeWidth="3" />
                          <circle
                            cx="24" cy="24" r="20" fill="none"
                            stroke={dept.color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={125.7}
                            strokeDashoffset={125.7 - 125.7 * (dept.score / 100)}
                            transform="rotate(-90 24 24)"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-foreground">
                          {dept.score}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-navy-700/60 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: dept.color }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${dept.score}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">{dept.insights}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={0.3}>
              <div className="mt-8 p-5 rounded-xl bg-navy-800/30 border border-navy-700/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-400" />
                    <span className="font-heading text-sm font-semibold text-foreground">Key Insight</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    Organizations with the highest AI readiness scores invest in cross-functional literacy programs
                    rather than siloed department training. The most effective approach pairs technical teams (Engineering, Data Science)
                    with business units (Marketing, Operations, Legal) in collaborative AI sprint exercises.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── RESOURCES LIBRARY ─────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Globe className="h-6 w-6 text-eari-blue-light" />
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                    Resources Library
                  </h2>
                </div>
                <p className="text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                  Curated external resources from leading organizations to deepen your understanding of AI readiness, governance, and responsible innovation.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'EU AI Act — Official Text',
                  description: 'The complete regulation establishing a harmonised framework for AI systems in the European Union, including risk classification and compliance requirements.',
                  url: 'https://artificialintelligenceact.eu/',
                  category: 'Regulation',
                  icon: Landmark,
                  color: '#3b82f6',
                },
                {
                  title: 'NIST AI Risk Management Framework',
                  description: 'The U.S. National Institute of Standards and Technology framework for managing risks in AI systems, offering voluntary guidelines for trustworthy AI.',
                  url: 'https://www.nist.gov/artificial-intelligence/ai-risk-management-framework',
                  category: 'Framework',
                  icon: Shield,
                  color: '#8b5cf6',
                },
                {
                  title: 'ISO/IEC 42001 — AI Management System',
                  description: 'The international standard for AI management systems, providing requirements for establishing, implementing, and improving AI governance within organizations.',
                  url: 'https://www.iso.org/standard/81230.html',
                  category: 'Standard',
                  icon: FileText,
                  color: '#06b6d4',
                },
                {
                  title: 'OECD AI Policy Observatory',
                  description: 'Comprehensive resource tracking AI policies across OECD member countries, with data on national AI strategies, regulatory developments, and policy trends.',
                  url: 'https://oecd.ai/en/',
                  category: 'Policy',
                  icon: Globe,
                  color: '#14b8a6',
                },
                {
                  title: 'Google AI Responsible Practices',
                  description: 'Practical guidance from Google on building AI systems responsibly, including fairness indicators, model cards, and explainability tooling for production systems.',
                  url: 'https://ai.google/responsibility/responsible-ai-practices/',
                  category: 'Best Practices',
                  icon: Lightbulb,
                  color: '#f59e0b',
                },
                {
                  title: 'Stanford HAI — AI Index Report',
                  description: 'The annual AI Index from Stanford\'s Human-Centered AI Institute, providing data-driven insights on AI progress, investment, policy, and societal impact worldwide.',
                  url: 'https://hai.stanford.edu/ai-index-report',
                  category: 'Research',
                  icon: GraduationCap,
                  color: '#ec4899',
                },
                {
                  title: 'Partnership on AI',
                  description: 'Multi-stakeholder organization developing best practices for AI, with research on responsible deployment, safety, and inclusive AI across industry and civil society.',
                  url: 'https://partnershiponai.org/',
                  category: 'Industry',
                  icon: Users,
                  color: '#a78bfa',
                },
                {
                  title: 'MIT AI Readiness Assessment Research',
                  description: 'Academic research from MIT on measuring organizational AI readiness, including frameworks for evaluating technical capability, data maturity, and strategic alignment.',
                  url: 'https://cis.mit.edu/topics/artificial-intelligence',
                  category: 'Research',
                  icon: Brain,
                  color: '#f472b6',
                },
                {
                  title: 'World Economic Forum — AI Governance Alliance',
                  description: 'The WEF initiative bringing together governments, industry, and civil society to shape responsible AI governance, with reports on AI transformation strategies.',
                  url: 'https://www.weforum.org/communities/ai-governance-alliance/',
                  category: 'Policy',
                  icon: Landmark,
                  color: '#d4a853',
                },
              ].map((resource, i) => {
                const RIcon = resource.icon;
                return (
                  <FadeUp key={resource.title} delay={i * 0.05}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-all duration-300 hover-lift h-full">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${resource.color}15` }}>
                              <RIcon className="h-5 w-5" style={{ color: resource.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] font-mono" style={{ borderColor: `${resource.color}40`, color: resource.color }}>
                                  {resource.category}
                                </Badge>
                              </div>
                              <h3 className="font-heading font-semibold text-foreground text-base mb-2 flex items-center gap-1.5">
                                {resource.title}
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </h3>
                              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                                {resource.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
