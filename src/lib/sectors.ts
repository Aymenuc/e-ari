/**
 * E-ARI Sector Definitions
 *
 * Each industry sector provides tailored question text and descriptions
 * for the 8-pillar assessment framework. The structural backbone (8 pillars,
 * 5 Likert questions each, 1-5 scale) remains consistent for scoring
 * comparability, but the wording is contextualized to the sector.
 *
 * Sectors can also adjust pillar weights to reflect industry priorities
 * (e.g., Healthcare weights Governance & Ethics higher than average).
 *
 * Question IDs remain stable (e.g., "strategy_1") so the scoring engine
 * and data model do not change — only the presentation layer adapts.
 */

import { PILLARS, type PillarDefinition } from './pillars';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SectorQuestionOverride {
  text: string;
  description: string;
}

export interface SectorPillarOverride {
  questions: SectorQuestionOverride[]; // Must be exactly 5 (matching base pillar)
  weight?: number; // Override default pillar weight for this sector
}

export interface SectorDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  highlights: string[]; // Key focus areas shown on the sector card
  pillarOverrides: Record<string, SectorPillarOverride>; // key = pillarId
}

// ─── Sector Definitions ─────────────────────────────────────────────────────

export const SECTORS: SectorDefinition[] = [
  {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    shortName: 'Healthcare',
    description: 'Hospitals, pharmaceutical companies, biotech firms, and medical research organizations deploying AI for clinical decision support, drug discovery, and patient outcomes.',
    icon: 'Heart',
    color: '#ef4444',
    highlights: ['Patient data privacy', 'Clinical AI validation', 'Regulatory compliance (HIPAA/FDA)', 'Diagnostic accuracy'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with clinical and operational objectives?',
            description: 'A healthcare-specific AI strategy ensures investments target measurable patient outcomes, clinical workflow improvements, and regulatory compliance rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI initiatives for clinical and operational improvement?',
            description: 'Executive sponsorship in healthcare is critical for securing budget for clinical validation, navigating regulatory requirements, and ensuring AI projects receive strategic priority alongside patient care.',
          },
          {
            text: 'How well are AI use cases prioritized based on clinical value, patient safety, and implementation feasibility?',
            description: 'Effective prioritization in healthcare prevents resource dilution across too many pilot projects and focuses effort on high-impact, clinically validated outcomes.',
          },
          {
            text: 'Does your organization have a multi-year AI investment roadmap with defined clinical and operational milestones?',
            description: 'Long-term roadmaps signal commitment to AI-driven healthcare transformation, enable phased capability building, and provide a framework for measuring clinical outcomes over time.',
          },
          {
            text: 'How effectively does your organization measure and communicate the ROI of AI initiatives in terms of patient outcomes and operational efficiency?',
            description: 'ROI measurement in healthcare must capture both financial returns and clinical value — reduced readmission rates, faster diagnostics, and improved patient satisfaction.',
          },
        ],
        weight: 0.13,
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your clinical and operational data?',
            description: 'Healthcare data quality is uniquely challenging due to fragmented EHR systems, unstructured clinical notes, and varying coding standards. Poor data quality directly impacts AI model reliability.',
          },
          {
            text: 'To what extent is your patient and operational data accessible across departments in standardized formats (e.g., FHIR, HL7)?',
            description: 'Siloed clinical data prevents holistic patient analysis and model training. Interoperability standards like FHIR accelerate AI development cycles across care settings.',
          },
          {
            text: 'Does your organization have mature data governance policies covering clinical data lineage, ownership, and quality standards?',
            description: 'Healthcare data governance ensures HIPAA compliance, patient consent management, and audit trails — prerequisites for trustworthy clinical AI systems.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting AI/ML workloads with real-time clinical data streams?',
            description: 'Robust clinical data pipelines enable real-time or near-real-time data delivery from EHRs, imaging systems, and wearables — essential for diagnostic AI and clinical decision support.',
          },
          {
            text: 'Does your infrastructure provide scalable compute and storage resources adequate for medical imaging AI and large-scale genomic analysis?',
            description: 'Healthcare AI workloads — especially medical imaging and genomics — require significant GPU compute and petabyte-scale storage that many healthcare organizations lack.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for clinical and operational applications?',
            description: 'A mature healthcare AI platform reduces friction in model development, enables clinical validation workflows, and provides standardized environments for diagnostic and operational AI.',
          },
          {
            text: 'To what extent does your organization practice MLOps for clinical AI (model monitoring, bias detection, automated retraining)?',
            description: 'Clinical MLOps ensures diagnostic models remain accurate across patient populations, enables rapid iteration on clinical feedback, and reduces the operational burden of maintaining AI at scale.',
          },
          {
            text: 'How effectively are AI models deployed into clinical workflows with integration to EHR systems and clinical decision support?',
            description: 'Production-grade clinical AI must integrate seamlessly with EHR workflows to be adopted by clinicians. Isolated tools that disrupt clinical workflows face significant adoption barriers.',
          },
          {
            text: 'How well integrated are AI capabilities with your existing clinical applications, imaging systems, and patient management workflows?',
            description: 'Deep integration with PACS, EHR, and clinical workflows amplifies AI impact and ensures it augments clinical decision-making rather than disrupting care delivery.',
          },
          {
            text: 'Does your organization effectively leverage cloud, edge, or hybrid infrastructure for clinical AI workloads and telemedicine?',
            description: 'Flexible infrastructure enables low-latency inference at the point of care, secure cloud-based model training on sensitive data, and scalability for variable clinical compute demands.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML technical talent to execute clinical and operational AI initiatives?',
            description: 'Healthcare AI talent scarcity is acute — professionals must understand both machine learning and clinical workflows. Organizations must assess whether they can staff critical roles without external support.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling and training programs for clinical and administrative staff?',
            description: 'Upskilling existing clinical staff on AI capabilities builds institutional knowledge and ensures AI tools are used appropriately within clinical contexts.',
          },
          {
            text: 'How well can your organization attract and retain AI/ML specialists in the competitive healthcare technology market?',
            description: 'Retention challenges in healthcare AI are severe — specialists are in high demand across pharma, tech, and provider organizations. A compelling mission and career path is essential.',
          },
          {
            text: 'To what extent do clinical teams have AI literacy sufficient to collaborate on AI initiatives and interpret model outputs?',
            description: 'Clinical AI success requires that physicians, nurses, and administrators understand AI capabilities, limitations, and how to interpret model outputs in clinical contexts.',
          },
          {
            text: 'Does your organization have defined AI career paths bridging clinical and technical roles?',
            description: 'Structured career development for clinical AI professionals — such as clinical data scientists and AI-informed clinicians — increases retention and fosters cross-functional collaboration.',
          },
        ],
      },
      governance: {
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for clinical AI decisions?',
            description: 'Healthcare AI governance must define who is responsible for clinical AI outcomes, ensure clinical oversight of algorithmic decisions, and create escalation paths for patient safety concerns.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in clinical algorithms across patient populations?',
            description: 'Bias in clinical AI can cause discriminatory diagnostic outcomes across demographics. Proactive detection and mitigation are essential for equitable healthcare delivery.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for clinical decision support?',
            description: 'Clinical transparency builds trust with patients and providers. Explainability is increasingly required for clinical AI — physicians must understand why a model recommends a diagnosis or treatment.',
          },
          {
            text: 'Are there established processes for AI risk assessment, clinical impact evaluation, and adverse event response?',
            description: 'Healthcare AI risk assessment identifies potential patient harms before deployment. Adverse event response ensures swift remediation when clinical AI produces unexpected or harmful outputs.',
          },
          {
            text: 'How well does your organization comply with healthcare-specific AI regulations (FDA, HIPAA, EU MDR) and emerging AI standards?',
            description: 'Regulatory compliance in healthcare AI is non-negotiable. Proactive alignment with FDA guidance on AI/ML-based Software as a Medical Device (SaMD) reduces legal risk and accelerates approvals.',
          },
        ],
        weight: 0.17,
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your organizational culture support experimentation and learning from AI pilot outcomes in clinical settings?',
            description: 'Healthcare AI adoption requires tolerance for iterative clinical validation. Cultures that punish experimentation will struggle to develop and deploy effective clinical AI.',
          },
          {
            text: 'To what extent do clinical, technical, and administrative teams collaborate effectively on AI initiatives?',
            description: 'Healthcare AI projects span clinical, data, IT, and compliance functions. Siloed teams produce misaligned solutions that fail to integrate into clinical workflows.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven clinical workflow transformation?',
            description: 'Change management in healthcare determines whether AI clinical tools are adopted or resisted. Without structured change management, even excellent diagnostic AI will be underutilized.',
          },
          {
            text: 'How receptive are clinicians and staff at all levels to AI augmentation of their roles?',
            description: 'Clinician receptiveness affects adoption rates. Fear-based resistance can derail implementations, while engaged clinicians accelerate value realization and identify high-impact use cases.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will improve patient care and support clinical staff?',
            description: 'Clear communication reduces clinician uncertainty, builds buy-in, and helps staff understand how AI enhances their clinical judgment rather than replacing it.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized clinical and operational processes suitable for AI automation?',
            description: 'Not all healthcare processes benefit from AI. Systematic identification ensures automation focuses on high-ROI opportunities like diagnostic support, scheduling, and claims processing.',
          },
          {
            text: 'How effectively are AI models integrated into clinical workflows with clinician-in-the-loop oversight where needed?',
            description: 'Human-in-the-loop design in healthcare balances efficiency with patient safety, ensuring critical diagnostic and treatment decisions receive clinical oversight while automating routine tasks.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered clinical process performance?',
            description: 'Without measurable clinical outcomes — such as diagnostic accuracy rates, time-to-treatment, and patient satisfaction — it is impossible to determine whether AI improves care.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven clinical processes?',
            description: 'Clinical AI systems degrade over time due to data drift and changing patient populations. Continuous improvement cycles ensure models remain clinically effective.',
          },
          {
            text: 'To what extent are clinical operations teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures clinical AI systems are maintained, monitored, and improved by teams closest to patient care contexts.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting clinical AI systems from adversarial attacks?',
            description: 'Healthcare AI systems face unique threats including adversarial medical imaging inputs, model inversion attacks on patient data, and prompt injection in clinical chatbots.',
          },
          {
            text: 'How effectively does your organization protect patient data privacy in AI training and inference processes?',
            description: 'Clinical AI models can memorize and leak patient data. Privacy-preserving techniques (federated learning, differential privacy) and HIPAA-compliant data handling are critical.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits and vulnerability assessments of clinical AI systems?',
            description: 'Regular clinical AI audits identify emerging threats, verify control effectiveness, and ensure compliance with healthcare security standards like HITRUST and HIPAA Security Rule.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for clinical AI systems and patient data?',
            description: 'Access controls limit the blast radius of breaches, and audit trails provide accountability and support forensic investigations required under HIPAA.',
          },
          {
            text: 'How well prepared is your organization for healthcare AI regulatory requirements (HIPAA, FDA AI/ML guidance, EU AI Act for medical devices)?',
            description: 'Healthcare regulatory readiness is critical — FDA premarket requirements for AI/ML-based SaMD, HIPAA privacy rules, and emerging EU AI Act medical device provisions demand proactive compliance.',
          },
        ],
      },
    },
  },
  {
    id: 'finance',
    name: 'Financial Services & Banking',
    shortName: 'Finance',
    description: 'Banks, insurance companies, investment firms, and fintech organizations deploying AI for risk modeling, fraud detection, algorithmic trading, and customer experience.',
    icon: 'Shield',
    color: '#3b82f6',
    highlights: ['Fraud detection & AML', 'Risk modeling & stress testing', 'Regulatory compliance (Basel/SOX)', 'Algorithmic trading'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with financial performance and regulatory objectives?',
            description: 'A finance-specific AI strategy ensures investments target measurable risk reduction, revenue growth, and regulatory compliance rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI initiatives across trading, risk, and customer operations?',
            description: 'Executive sponsorship in financial services is critical for securing budget, navigating regulatory requirements, and ensuring AI projects receive strategic priority alongside core banking operations.',
          },
          {
            text: 'How well are AI use cases prioritized based on financial impact, regulatory risk, and implementation feasibility?',
            description: 'Effective prioritization in finance prevents resource dilution across too many pilot projects and focuses effort on high-ROI opportunities like fraud detection and risk modeling.',
          },
          {
            text: 'Does your organization have a multi-year AI investment roadmap with defined financial and regulatory milestones?',
            description: 'Long-term roadmaps signal commitment, enable phased capability building, and provide a framework for measuring AI-driven revenue and risk reduction over time.',
          },
          {
            text: 'How effectively does your organization measure and communicate the ROI of AI initiatives in terms of revenue impact, cost reduction, and risk mitigation?',
            description: 'Financial ROI measurement must capture direct revenue impact (e.g., better pricing models), cost reduction (e.g., automated compliance), and risk mitigation (e.g., reduced fraud losses).',
          },
        ],
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your financial transaction and market data?',
            description: 'Financial data quality directly impacts model reliability — incomplete transaction data, inconsistent market feeds, and unstructured document data (contracts, filings) undermine AI performance.',
          },
          {
            text: 'To what extent is your financial data accessible across business lines in standardized formats?',
            description: 'Siloed financial data across trading desks, risk teams, and compliance departments prevents holistic analysis. Standardized data accelerates model development and regulatory reporting.',
          },
          {
            text: 'Does your organization have mature data governance policies covering financial data lineage, ownership, and quality standards?',
            description: 'Financial data governance ensures BCBS 239 compliance, audit trails for model inputs, and accountability — prerequisites for trustworthy risk models and regulatory submissions.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting real-time fraud detection, market analytics, and risk computation workloads?',
            description: 'Real-time financial data pipelines enable sub-second fraud detection, live market analytics, and intraday risk calculations essential for modern financial operations.',
          },
          {
            text: 'Does your infrastructure provide scalable compute and storage resources adequate for large-scale risk simulation and market data processing?',
            description: 'Financial AI workloads — Monte Carlo simulations, stress testing, and high-frequency data processing — require significant compute and low-latency storage infrastructure.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for risk, trading, and customer analytics applications?',
            description: 'A mature financial AI platform reduces friction in model development, enables model risk management workflows, and provides standardized environments for regulatory validation.',
          },
          {
            text: 'To what extent does your organization practice MLOps with model risk management, performance monitoring, and automated retraining?',
            description: 'Financial MLOps ensures models remain performant and compliant, enables rapid iteration on market changes, and satisfies SR 11-7 model risk management requirements.',
          },
          {
            text: 'How effectively are AI models deployed into production with version control, monitoring, and regulatory audit trails?',
            description: 'Production-grade model management in finance prevents model drift, ensures reproducibility for regulatory examinations, and provides the audit trails required by supervisors.',
          },
          {
            text: 'How well integrated are AI capabilities with your core banking systems, trading platforms, and compliance workflows?',
            description: 'Deep integration with core banking, trading, and compliance systems amplifies AI impact and ensures models augment rather than disrupt critical financial operations.',
          },
          {
            text: 'Does your organization effectively leverage cloud, on-premise, or hybrid infrastructure for sensitive financial AI workloads?',
            description: 'Financial infrastructure must balance scalability with data residency requirements, latency constraints for trading systems, and regulatory restrictions on data processing locations.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML technical talent to execute risk, trading, and compliance AI initiatives?',
            description: 'Financial AI talent must understand both machine learning and financial markets. Quantitative researchers and ML engineers who understand risk are particularly scarce.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling programs for risk analysts, traders, and compliance staff?',
            description: 'Upskilling existing financial professionals on AI capabilities builds institutional knowledge and ensures models are used appropriately within risk and compliance contexts.',
          },
          {
            text: 'How well can your organization attract and retain AI/ML specialists in the competitive fintech and quant talent market?',
            description: 'Retention challenges in financial AI are severe — specialists are in high demand across hedge funds, banks, and fintech startups. Competitive compensation and meaningful problems are essential.',
          },
          {
            text: 'To what extent do risk, compliance, and business teams have AI literacy sufficient to collaborate on AI initiatives?',
            description: 'Financial AI success requires cross-functional collaboration. Risk managers and compliance officers must understand AI capabilities and limitations to define effective model governance.',
          },
          {
            text: 'Does your organization have defined AI career paths bridging quantitative finance and machine learning roles?',
            description: 'Structured career development for quantitative ML professionals — such as ML quants and AI risk specialists — increases retention and fosters cross-functional expertise.',
          },
        ],
      },
      governance: {
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for model risk and financial AI decisions?',
            description: 'Financial AI governance must define who is responsible for model outcomes, ensure risk management oversight, and create escalation paths for model failures — aligned with SR 11-7 principles.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in credit, lending, and insurance algorithms?',
            description: 'Bias in financial AI can cause discriminatory lending and insurance outcomes. Proactive detection and mitigation are essential for fair lending compliance and equitable service.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for regulators and customers?',
            description: 'Financial transparency builds trust with regulators and customers. The right to explanation under GDPR and fair lending requirements demand model interpretability.',
          },
          {
            text: 'Are there established processes for AI model risk assessment, stress testing, and incident response?',
            description: 'Model risk assessment identifies potential financial harms before deployment. Stress testing ensures model robustness, and incident response ensures swift remediation when models fail.',
          },
          {
            text: 'How well does your organization comply with financial AI regulations (SR 11-7, Basel III, GDPR, EU AI Act) and industry standards?',
            description: 'Financial regulatory compliance is non-negotiable. Proactive alignment with model risk management guidance, capital requirements, and emerging AI regulations reduces legal risk.',
          },
        ],
        weight: 0.17,
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your organizational culture support experimentation and learning from AI pilot outcomes in trading and risk?',
            description: 'Financial AI adoption requires tolerance for iterative model validation. Cultures that punish experimentation will struggle to develop effective risk and trading AI systems.',
          },
          {
            text: 'To what extent do risk, technology, and business teams collaborate effectively on AI initiatives?',
            description: 'Financial AI projects span risk, technology, trading, and compliance functions. Siloed teams produce misaligned models that fail to deliver measurable risk reduction or revenue.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven financial process transformation?',
            description: 'Change management in finance determines whether AI tools are adopted by traders and risk managers. Without structured change management, even excellent models will be underutilized.',
          },
          {
            text: 'How receptive are financial professionals at all levels to AI augmentation of their analytical and decision-making roles?',
            description: 'Professional receptiveness affects adoption rates. Fear of being replaced by algorithms can derail implementations, while engaged analysts accelerate value realization.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will enhance financial performance and support professional development?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps financial professionals understand how AI enhances their analytical capabilities rather than replacing their judgment.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized financial processes suitable for AI automation (e.g., KYC, underwriting, reconciliation)?',
            description: 'Systematic identification ensures AI automation focuses on high-ROI financial opportunities like KYC automation, credit underwriting, and trade reconciliation.',
          },
          {
            text: 'How effectively are AI models integrated into financial workflows with human-in-the-loop oversight for high-stakes decisions?',
            description: 'Human-in-the-loop design in finance balances efficiency with risk control, ensuring critical credit and trading decisions receive human oversight while automating routine processes.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered financial process performance?',
            description: 'Without measurable financial outcomes — false positive rates in fraud detection, model accuracy in credit scoring, processing time reduction — AI value cannot be assessed.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven financial processes?',
            description: 'Financial AI models degrade over time due to market regime changes and data drift. Continuous improvement cycles ensure models remain effective across market conditions.',
          },
          {
            text: 'To what extent are financial operations teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures financial AI systems are maintained, monitored, and improved by teams closest to market and customer contexts.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting trading algorithms and financial AI systems from adversarial manipulation?',
            description: 'Financial AI faces unique threats including market manipulation attacks on algorithmic trading, adversarial inputs to fraud models, and model extraction to replicate proprietary strategies.',
          },
          {
            text: 'How effectively does your organization protect customer financial data privacy in AI training and inference processes?',
            description: 'Financial AI models can memorize and leak sensitive customer data. Privacy-preserving techniques and data handling protocols are critical for compliance with financial privacy regulations.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits and penetration testing of financial AI systems?',
            description: 'Regular audits identify emerging threats, verify control effectiveness, and ensure compliance with financial security standards and regulatory examination expectations.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for AI systems processing financial data?',
            description: 'Access controls limit the blast radius of breaches, and audit trails provide accountability and support forensic investigations required under financial regulations.',
          },
          {
            text: 'How well prepared is your organization for financial AI regulatory requirements (MiFID II, Dodd-Frank, PCI DSS, EU AI Act for credit scoring)?',
            description: 'Financial regulatory readiness is critical — algorithmic trading transparency requirements, fair lending provisions, and the EU AI Act\'s high-risk classification for credit scoring demand proactive compliance.',
          },
        ],
      },
    },
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Industrial',
    shortName: 'Manufacturing',
    description: 'Discrete and process manufacturers, industrial automation companies, and supply chain organizations deploying AI for predictive maintenance, quality control, and operational optimization.',
    icon: 'Settings',
    color: '#f59e0b',
    highlights: ['Predictive maintenance', 'Quality inspection AI', 'Supply chain optimization', 'Digital twin technology'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with operational excellence and manufacturing objectives?',
            description: 'A manufacturing-specific AI strategy ensures investments target measurable OEE improvements, quality yield increases, and supply chain optimization rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI initiatives for smart manufacturing and Industry 4.0?',
            description: 'Executive sponsorship is critical for securing capital expenditure for IoT infrastructure, navigating operational change management, and ensuring AI projects align with production priorities.',
          },
          {
            text: 'How well are AI use cases prioritized based on operational impact, safety considerations, and implementation feasibility?',
            description: 'Effective prioritization in manufacturing prevents resource dilution across too many pilot projects and focuses effort on high-impact use cases like predictive maintenance and quality control.',
          },
          {
            text: 'Does your organization have a multi-year AI investment roadmap with defined manufacturing and supply chain milestones?',
            description: 'Long-term roadmaps signal commitment to smart manufacturing, enable phased IoT and AI capability building, and provide a framework for measuring operational improvements over time.',
          },
          {
            text: 'How effectively does your organization measure and communicate the ROI of AI initiatives in terms of OEE, yield, and operational cost reduction?',
            description: 'Manufacturing ROI measurement must capture equipment uptime improvements, defect rate reductions, energy savings, and supply chain efficiency gains.',
          },
        ],
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your IoT sensor data, production logs, and supply chain data?',
            description: 'Manufacturing data quality is challenging due to sensor noise, missing readings, and inconsistent data capture across legacy equipment. Poor data quality directly impacts predictive model reliability.',
          },
          {
            text: 'To what extent is your production and supply chain data accessible across plants and departments in standardized formats?',
            description: 'Siloed plant data prevents cross-facility analysis and model training. Standardized data formats (e.g., OPC-UA, MQTT) accelerate AI development and enable benchmarking across sites.',
          },
          {
            text: 'Does your organization have mature data governance policies covering sensor data lineage, equipment data ownership, and quality standards?',
            description: 'Manufacturing data governance ensures data provenance for model traceability, equipment data accountability, and quality standards required for reliable predictive maintenance.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting real-time IoT analytics and AI/ML workloads?',
            description: 'Robust edge-to-cloud data pipelines enable real-time sensor data processing, which is essential for predictive maintenance, quality monitoring, and digital twin applications.',
          },
          {
            text: 'Does your infrastructure provide scalable edge and cloud compute resources adequate for industrial AI workloads?',
            description: 'Industrial AI requires edge computing for real-time inference on the shop floor and cloud resources for model training on large volumes of sensor and production data.',
          },
        ],
        weight: 0.17,
      },
      technology: {
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for predictive maintenance, quality inspection, and supply chain optimization?',
            description: 'A mature industrial AI platform reduces friction in model development, enables edge deployment workflows, and provides standardized environments for operational AI applications.',
          },
          {
            text: 'To what extent does your organization practice MLOps for industrial AI (model monitoring, edge deployment, automated retraining on new sensor data)?',
            description: 'Industrial MLOps ensures models remain accurate as equipment ages and operating conditions change, enables rapid iteration on production feedback, and supports edge deployment at scale.',
          },
          {
            text: 'How effectively are AI models deployed to edge devices and integrated with SCADA/MES/ERP systems?',
            description: 'Production-grade industrial AI must integrate with SCADA for real-time control, MES for production tracking, and ERP for supply chain coordination. Isolated models deliver limited operational value.',
          },
          {
            text: 'How well integrated are AI capabilities with your existing manufacturing execution systems, PLCs, and quality management workflows?',
            description: 'Deep integration with manufacturing systems amplifies AI impact and ensures it augments production operations rather than disrupting established workflows.',
          },
          {
            text: 'Does your organization effectively leverage edge, cloud, or hybrid infrastructure for industrial AI workloads and digital twins?',
            description: 'Flexible infrastructure enables low-latency inference at the edge for real-time quality control, cloud-based model training on sensor data, and digital twin simulation at scale.',
          },
        ],
        weight: 0.14,
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML and IoT technical talent to execute smart manufacturing initiatives?',
            description: 'Industrial AI talent must understand both machine learning and manufacturing processes. Professionals who can bridge data science and operational technology are particularly scarce.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling programs for production engineers, maintenance teams, and quality staff?',
            description: 'Upskilling existing manufacturing staff on AI capabilities builds institutional knowledge and ensures predictive maintenance and quality AI tools are used effectively on the shop floor.',
          },
          {
            text: 'How well can your organization attract and retain AI/ML specialists in the competitive industrial technology market?',
            description: 'Retention challenges in industrial AI are significant — specialists are drawn to tech companies with higher compensation. A compelling mission around Industry 4.0 transformation is essential.',
          },
          {
            text: 'To what extent do production and operations teams have AI literacy sufficient to collaborate on smart manufacturing initiatives?',
            description: 'Manufacturing AI success requires collaboration between data scientists and production teams. Operators and engineers must understand AI capabilities to define effective use cases.',
          },
          {
            text: 'Does your organization have defined AI career paths bridging operational technology and data science roles?',
            description: 'Structured career development for industrial AI professionals — such as data-driven reliability engineers and AI-augmented quality specialists — increases retention and cross-functional expertise.',
          },
        ],
      },
      governance: {
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for industrial AI safety and operational decisions?',
            description: 'Manufacturing AI governance must define who is responsible for AI-driven safety decisions, ensure operational oversight, and create escalation paths for equipment and quality risks.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in quality inspection and production optimization algorithms?',
            description: 'Bias in industrial AI can cause inconsistent quality inspection across product variants or unfair resource allocation across production lines. Proactive detection ensures equitable performance.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for maintenance predictions and quality decisions?',
            description: 'Operational transparency builds trust with plant managers and operators. Explainability is critical when AI recommends equipment shutdowns or flags quality issues that impact production schedules.',
          },
          {
            text: 'Are there established processes for AI risk assessment, safety impact evaluation, and incident response for industrial AI systems?',
            description: 'Industrial AI risk assessment identifies potential safety hazards before deployment. Incident response ensures swift remediation when AI-driven systems behave unexpectedly on the production floor.',
          },
          {
            text: 'How well does your organization comply with industrial AI safety standards (ISO 13849, IEC 61508) and emerging AI regulations?',
            description: 'Industrial regulatory compliance is critical for AI systems that interact with safety-critical equipment. Proactive alignment with functional safety standards reduces risk and liability.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your organizational culture support experimentation and learning from AI pilot outcomes on the production floor?',
            description: 'Manufacturing AI adoption requires tolerance for iterative deployment and validation. Cultures that punish experimentation will struggle to develop and scale effective operational AI.',
          },
          {
            text: 'To what extent do production, engineering, IT, and quality teams collaborate effectively on smart manufacturing AI initiatives?',
            description: 'Industrial AI projects span OT, IT, quality, and maintenance functions. Siloed teams produce solutions that fail to integrate with production realities and operational constraints.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven manufacturing process transformation?',
            description: 'Change management in manufacturing determines whether AI tools are adopted by operators and maintenance teams. Without structured change management, even excellent predictive models will be ignored.',
          },
          {
            text: 'How receptive are production workers and operators to AI augmentation of their roles?',
            description: 'Operator receptiveness affects adoption rates. Fear of being replaced by automation can derail implementations, while engaged workers accelerate value realization from predictive tools.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will improve working conditions and operational performance?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps operators understand how AI enhances safety and productivity rather than threatening their livelihoods.',
          },
        ],
      },
      process: {
        weight: 0.14,
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized manufacturing processes suitable for AI automation and optimization?',
            description: 'Systematic identification ensures AI focuses on high-ROI manufacturing opportunities like predictive maintenance, automated quality inspection, and demand-driven scheduling.',
          },
          {
            text: 'How effectively are AI models integrated into production workflows with operator-in-the-loop oversight for safety-critical decisions?',
            description: 'Human-in-the-loop design in manufacturing balances automation efficiency with safety, ensuring critical decisions about equipment shutdowns and quality holds receive human oversight.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered manufacturing process performance?',
            description: 'Without measurable manufacturing outcomes — OEE improvements, defect rate reductions, mean time between failures — AI value in production cannot be assessed.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven manufacturing processes?',
            description: 'Industrial AI models degrade as equipment ages and processes change. Continuous improvement cycles ensure predictive models remain accurate across changing production conditions.',
          },
          {
            text: 'To what extent are production and maintenance teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures industrial AI systems are maintained, monitored, and improved by teams closest to the production floor and equipment contexts.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting industrial control systems and AI-driven automation?',
            description: 'Industrial AI systems face unique threats including adversarial sensor manipulation, attacks on predictive maintenance models, and OT/IT convergence vulnerabilities.',
          },
          {
            text: 'How effectively does your organization protect proprietary manufacturing data and trade secrets in AI training processes?',
            description: 'Manufacturing AI models trained on proprietary processes and formulations represent significant intellectual property. Privacy-preserving techniques protect competitive advantages.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits of industrial AI systems and OT/IT integration points?',
            description: 'Regular audits identify emerging threats at the IT/OT boundary, verify control effectiveness, and ensure compliance with industrial cybersecurity standards like IEC 62443.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for AI systems connected to industrial control systems?',
            description: 'Access controls limit the blast radius of attacks on production systems, and audit trails provide accountability and support forensic investigations of operational incidents.',
          },
          {
            text: 'How well prepared is your organization for industrial AI cybersecurity requirements (IEC 62443, NIST CSF) and emerging AI regulations?',
            description: 'Industrial cybersecurity readiness is critical — AI systems connected to SCADA and PLCs expand the attack surface and must meet functional safety and cybersecurity requirements.',
          },
        ],
      },
    },
  },
  {
    id: 'retail',
    name: 'Retail & E-Commerce',
    shortName: 'Retail',
    description: 'Retailers, e-commerce platforms, and consumer goods companies deploying AI for personalization, demand forecasting, customer analytics, and supply chain optimization.',
    icon: 'Target',
    color: '#8b5cf6',
    highlights: ['Customer personalization', 'Demand forecasting', 'Inventory optimization', 'Visual search & recommendations'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with customer experience and revenue growth objectives?',
            description: 'A retail-specific AI strategy ensures investments target measurable customer satisfaction improvements, revenue growth through personalization, and operational efficiency rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI initiatives for customer experience and operational improvement?',
            description: 'Executive sponsorship in retail is critical for securing budget for data infrastructure, navigating the fast pace of consumer expectations, and ensuring AI projects align with merchandising priorities.',
          },
          {
            text: 'How well are AI use cases prioritized based on customer impact, revenue potential, and implementation feasibility?',
            description: 'Effective prioritization in retail prevents resource dilution across too many pilot projects and focuses effort on high-impact opportunities like recommendation engines and demand forecasting.',
          },
          {
            text: 'Does your organization have a multi-year AI investment roadmap with defined customer experience and revenue milestones?',
            description: 'Long-term roadmaps signal commitment to AI-driven retail transformation, enable phased capability building, and provide a framework for measuring customer lifetime value improvements.',
          },
          {
            text: 'How effectively does your organization measure and communicate the ROI of AI initiatives in terms of customer engagement, conversion, and operational efficiency?',
            description: 'Retail ROI measurement must capture customer-centric metrics (conversion rates, AOV, NPS) alongside operational efficiency gains (inventory turnover, fulfillment cost reduction).',
          },
        ],
      },
      data: {
        weight: 0.17,
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your customer behavior, transaction, and product data?',
            description: 'Retail data quality challenges include fragmented customer identities across channels, inconsistent product catalogs, and incomplete behavioral data. Poor data quality undermines personalization accuracy.',
          },
          {
            text: 'To what extent is your customer and product data accessible across channels (online, in-store, mobile) in standardized formats?',
            description: 'Omnichannel retail requires unified customer data across touchpoints. Siloed channel data prevents holistic customer understanding and limits AI personalization effectiveness.',
          },
          {
            text: 'Does your organization have mature data governance policies covering customer data lineage, consent management, and data quality standards?',
            description: 'Retail data governance ensures GDPR/CCPA compliance for customer data, consent management for personalization, and quality standards required for reliable recommendation and forecasting models.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting real-time customer analytics and demand forecasting workloads?',
            description: 'Real-time retail data pipelines enable live personalization, dynamic pricing, and just-in-time inventory management essential for competitive retail operations.',
          },
          {
            text: 'Does your infrastructure provide scalable compute and storage resources adequate for large-scale customer analytics and recommendation systems?',
            description: 'Retail AI workloads — real-time recommendation engines, image-based product search, and demand forecasting across millions of SKUs — require significant compute and low-latency data access.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for personalization, merchandising, and supply chain applications?',
            description: 'A mature retail AI platform reduces friction in model development, enables A/B testing at scale, and provides standardized environments for recommendation and forecasting models.',
          },
          {
            text: 'To what extent does your organization practice MLOps for retail AI (model monitoring, A/B testing, automated retraining on seasonal data)?',
            description: 'Retail MLOps ensures recommendation and forecasting models remain accurate across seasons and promotions, enables rapid iteration on customer feedback, and supports continuous experimentation.',
          },
          {
            text: 'How effectively are AI models deployed into production with real-time serving for recommendations and dynamic pricing?',
            description: 'Production-grade retail AI must serve personalized recommendations in milliseconds and adjust pricing dynamically. Latency and scalability directly impact conversion rates and revenue.',
          },
          {
            text: 'How well integrated are AI capabilities with your e-commerce platform, POS systems, and inventory management?',
            description: 'Deep integration with Shopify/commerce platforms, POS systems, and OMS/WMS amplifies AI impact and ensures personalization and forecasting augment the end-to-end customer journey.',
          },
          {
            text: 'Does your organization effectively leverage cloud and edge infrastructure for retail AI workloads and in-store intelligence?',
            description: 'Flexible infrastructure enables cloud-based model training on customer data, edge inference for in-store analytics, and scalability for seasonal traffic spikes.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML technical talent to execute personalization, forecasting, and supply chain AI initiatives?',
            description: 'Retail AI talent must understand both machine learning and consumer behavior. Data scientists who can translate merchandising requirements into ML problems are particularly valuable.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling programs for merchandising, marketing, and supply chain teams?',
            description: 'Upskilling existing retail professionals on AI capabilities builds institutional knowledge and ensures AI tools are used effectively to inform merchandising and marketing decisions.',
          },
          {
            text: 'How well can your organization attract and retain AI/ML specialists in the competitive retail technology market?',
            description: 'Retail competes with tech companies and startups for AI talent. A compelling mission around transforming customer experience and a strong data environment are essential for retention.',
          },
          {
            text: 'To what extent do merchandising, marketing, and operations teams have AI literacy sufficient to collaborate on AI initiatives?',
            description: 'Retail AI success requires collaboration between data science and business teams. Merchandisers and marketers must understand AI capabilities to define effective personalization strategies.',
          },
          {
            text: 'Does your organization have defined AI career paths bridging retail analytics and data science roles?',
            description: 'Structured career development for retail AI professionals — such as AI merchandising specialists and data-driven buyer roles — increases retention and cross-functional expertise.',
          },
        ],
      },
      governance: {
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for customer-facing AI decisions?',
            description: 'Retail AI governance must define who is responsible for personalization outcomes, pricing decisions, and customer data usage, ensuring oversight and accountability.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in recommendations, pricing, and customer segmentation?',
            description: 'Bias in retail AI can cause discriminatory pricing, exclusionary recommendations, and unfair customer treatment. Proactive detection ensures equitable customer experiences.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for customers regarding recommendations and pricing?',
            description: 'Retail transparency builds customer trust. Explainability in recommendations ("Why am I seeing this?") and fair pricing practices are increasingly expected by consumers and regulators.',
          },
          {
            text: 'Are there established processes for AI risk assessment, customer impact evaluation, and incident response?',
            description: 'Retail AI risk assessment identifies potential harms before deployment — such as pricing errors or offensive recommendations. Incident response ensures swift remediation.',
          },
          {
            text: 'How well does your organization comply with consumer protection regulations (GDPR, CCPA, EU AI Act for pricing/recommendations) and industry standards?',
            description: 'Consumer data regulatory compliance is non-negotiable. Proactive alignment with GDPR, CCPA, and the EU AI Act\'s transparency requirements for recommendation systems reduces legal risk.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your organizational culture support experimentation and learning from AI-driven A/B testing and pilot outcomes?',
            description: 'Retail AI adoption thrives on experimentation cultures that embrace A/B testing, rapid iteration, and data-driven decision-making. Cultures that rely solely on intuition struggle with AI adoption.',
          },
          {
            text: 'To what extent do merchandising, marketing, technology, and operations teams collaborate effectively on AI initiatives?',
            description: 'Retail AI projects span merchandising, marketing, data science, and supply chain functions. Siloed teams produce personalization that lacks business context and forecasting that ignores market realities.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven retail transformation?',
            description: 'Change management in retail determines whether AI tools are adopted by buyers, marketers, and store teams. Without structured change management, even excellent recommendation engines will be underutilized.',
          },
          {
            text: 'How receptive are retail professionals at all levels to AI augmentation of merchandising and customer engagement decisions?',
            description: 'Buyer and marketer receptiveness affects adoption rates. Fear of being replaced by algorithms can derail implementations, while engaged teams accelerate value realization from AI insights.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will enhance customer experience and empower retail teams?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps retail professionals understand how AI enhances their merchandising expertise rather than replacing their judgment.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized retail processes suitable for AI automation (e.g., demand planning, pricing, customer service)?',
            description: 'Systematic identification ensures AI focuses on high-ROI retail opportunities like automated demand forecasting, dynamic pricing, and AI-powered customer service.',
          },
          {
            text: 'How effectively are AI models integrated into retail workflows with merchandiser-in-the-loop oversight for strategic decisions?',
            description: 'Human-in-the-loop design in retail balances automation efficiency with merchandiser expertise, ensuring strategic assortment and pricing decisions receive human oversight while automating routine tasks.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered retail process performance?',
            description: 'Without measurable retail outcomes — forecast accuracy, recommendation click-through rates, inventory turnover improvements — AI value in merchandising cannot be assessed.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven retail processes?',
            description: 'Retail AI models must adapt to seasonal changes, trend shifts, and evolving customer preferences. Continuous improvement cycles ensure models remain effective across dynamic retail conditions.',
          },
          {
            text: 'To what extent are merchandising and operations teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures retail AI systems are maintained, monitored, and improved by teams closest to customer behavior and market dynamics.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting recommendation engines and customer-facing AI systems?',
            description: 'Retail AI faces threats including recommendation manipulation, adversarial inputs to visual search models, and attacks on dynamic pricing algorithms.',
          },
          {
            text: 'How effectively does your organization protect customer personal data and purchase history in AI training and inference processes?',
            description: 'Retail AI models process sensitive customer data. Privacy-preserving techniques and GDPR/CCPA-compliant data handling are critical for maintaining customer trust and regulatory compliance.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits of customer-facing AI systems and data processing pipelines?',
            description: 'Regular audits identify threats to customer data, verify control effectiveness, and ensure compliance with consumer protection and data privacy regulations.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for AI systems processing customer and transaction data?',
            description: 'Access controls limit exposure of customer data, and audit trails provide accountability and support forensic investigations required under data protection regulations.',
          },
          {
            text: 'How well prepared is your organization for retail AI regulatory requirements (GDPR, CCPA, PCI DSS, EU AI Act for consumer-facing AI)?',
            description: 'Consumer-facing AI regulatory readiness is critical — GDPR right to explanation, CCPA data access requests, and the EU AI Act\'s transparency obligations for recommendation systems require proactive compliance.',
          },
        ],
      },
    },
  },
  {
    id: 'government',
    name: 'Government & Public Sector',
    shortName: 'Government',
    description: 'Federal, state, and local government agencies, public service organizations, and defense institutions deploying AI for citizen services, policy analysis, and operational efficiency.',
    icon: 'Shield',
    color: '#64748b',
    highlights: ['Citizen service delivery', 'Policy & regulatory AI', 'Procurement & transparency', 'National security applications'],
    pillarOverrides: {
      strategy: {
        weight: 0.14,
        questions: [
          {
            text: 'Does your agency have a formally documented AI strategy aligned with mission objectives and public service mandates?',
            description: 'A government-specific AI strategy ensures investments target measurable citizen outcomes, service delivery improvements, and compliance with public sector mandates rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does agency leadership actively champion and resource AI initiatives for mission delivery and public service improvement?',
            description: 'Executive sponsorship in government is critical for securing appropriations, navigating procurement requirements, and ensuring AI projects align with legislative mandates and public interest.',
          },
          {
            text: 'How well are AI use cases prioritized based on public value, mission criticality, and implementation feasibility?',
            description: 'Effective prioritization in government prevents resource dilution across too many pilot projects and focuses effort on high-impact, mission-critical outcomes that serve the public interest.',
          },
          {
            text: 'Does your agency have a multi-year AI investment roadmap with defined mission and service delivery milestones?',
            description: 'Long-term roadmaps signal commitment, enable phased capability building aligned with budget cycles, and provide a framework for measuring public service improvements over time.',
          },
          {
            text: 'How effectively does your agency measure and communicate the public value and mission impact of AI initiatives?',
            description: 'Government ROI measurement must capture public value metrics — citizen satisfaction, service accessibility, processing time reduction, and mission effectiveness — alongside cost efficiency.',
          },
        ],
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your citizen, operational, and policy data?',
            description: 'Government data quality is challenging due to legacy systems, data silos across agencies, and inconsistent data standards. Poor data quality undermines AI effectiveness for public services.',
          },
          {
            text: 'To what extent is your agency data accessible across departments in standardized, interoperable formats?',
            description: 'Siloed government data prevents holistic policy analysis and service delivery. Interoperability standards and data sharing frameworks accelerate AI development across agencies.',
          },
          {
            text: 'Does your agency have mature data governance policies covering citizen data lineage, privacy protections, and data quality standards?',
            description: 'Government data governance ensures privacy act compliance, citizen data protection, and accountability for data-driven decisions — prerequisites for trustworthy public sector AI.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting AI/ML workloads with government data systems?',
            description: 'Government data pipelines must navigate legacy systems, security classifications, and interoperability requirements while enabling AI-ready data for mission applications.',
          },
          {
            text: 'Does your infrastructure provide compliant and scalable compute resources adequate for government AI workloads?',
            description: 'Government AI infrastructure must balance scalability with FedRAMP/authority-to-operate requirements, data residency mandates, and security classification needs.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your agency\'s AI/ML platform ecosystem for mission and citizen service applications?',
            description: 'A mature government AI platform reduces friction in compliant model development, enables knowledge sharing across agencies, and provides standardized environments for mission AI.',
          },
          {
            text: 'To what extent does your agency practice MLOps for government AI (model monitoring, compliance documentation, authorized retraining)?',
            description: 'Government MLOps ensures models remain performant and compliant with authority-to-operate requirements, enables documented model updates, and supports audit requirements.',
          },
          {
            text: 'How effectively are AI models deployed into production with compliance documentation and security authorizations?',
            description: 'Government AI deployment requires authority-to-operate, security documentation, and continuous monitoring — processes that must be streamlined without compromising oversight.',
          },
          {
            text: 'How well integrated are AI capabilities with your existing government systems, case management, and citizen service platforms?',
            description: 'Deep integration with government systems of record, case management platforms, and citizen-facing services amplifies AI impact and ensures seamless service delivery.',
          },
          {
            text: 'Does your agency effectively leverage authorized cloud, on-premise, or hybrid infrastructure for government AI workloads?',
            description: 'Government infrastructure must balance cloud scalability with FedRAMP authorization, data sovereignty requirements, and security classification handling needs.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your agency have sufficient AI/ML technical talent to execute mission and citizen service AI initiatives?',
            description: 'Government AI talent scarcity is severe — agencies compete with private sector compensation. Assessing whether critical roles can be staffed through hiring, contracting, or cross-agency sharing is essential.',
          },
          {
            text: 'How effective are your agency\'s AI upskilling and training programs for civil servants and policy staff?',
            description: 'Upskilling existing government staff on AI capabilities builds institutional knowledge and ensures AI tools are used appropriately within policy and regulatory contexts.',
          },
          {
            text: 'How well can your agency attract and retain AI/ML specialists given government compensation and hiring constraints?',
            description: 'Retention challenges in government AI are significant — private sector offers higher compensation. Mission-driven recruiting, flexible work arrangements, and professional development are essential.',
          },
          {
            text: 'To what extent do policy, operations, and program teams have AI literacy sufficient to collaborate on AI initiatives?',
            description: 'Government AI success requires cross-functional collaboration. Policy staff and program managers must understand AI capabilities and limitations to define effective mission use cases.',
          },
          {
            text: 'Does your agency have defined AI career paths and rotational programs bridging technical and policy roles?',
            description: 'Structured career development for government AI professionals — including cross-agency rotations and technology-policy bridge roles — increases retention and builds institutional AI capacity.',
          },
        ],
      },
      governance: {
        weight: 0.17,
        questions: [
          {
            text: 'Does your agency have a formal AI governance framework with clear accountability for public-facing AI decisions?',
            description: 'Government AI governance must define who is responsible for AI-driven decisions affecting citizens, ensure democratic oversight, and create accountability structures for algorithmic systems.',
          },
          {
            text: 'How mature are your agency\'s practices for detecting and mitigating AI bias in services affecting diverse citizen populations?',
            description: 'Bias in government AI can cause discriminatory service delivery across demographic groups. Proactive detection and mitigation are essential for equitable public services and legal compliance.',
          },
          {
            text: 'To what extent does your agency ensure AI transparency and explainability for citizens and oversight bodies?',
            description: 'Government transparency is a democratic imperative. Citizens and oversight bodies must understand how AI systems make decisions that affect their access to services and benefits.',
          },
          {
            text: 'Are there established processes for AI risk assessment, public impact evaluation, and incident response?',
            description: 'Government AI risk assessment identifies potential harms to citizens before deployment. Incident response ensures swift remediation when AI systems produce incorrect or harmful decisions.',
          },
          {
            text: 'How well does your agency comply with government AI regulations (OMB AI guidance, FedRAMP, Section 508, EU AI Act for public services)?',
            description: 'Government regulatory compliance is mandatory. Proactive alignment with OMB AI management guidance, accessibility standards, and emerging public sector AI regulations ensures legal and ethical AI deployment.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your agency culture support experimentation and learning from AI pilot outcomes in public service delivery?',
            description: 'Government AI adoption requires tolerance for iterative development within risk-averse cultures. Agencies that punish experimentation will struggle to develop effective public service AI.',
          },
          {
            text: 'To what extent do policy, operations, IT, and program teams collaborate effectively on AI initiatives?',
            description: 'Government AI projects span policy, operations, IT, and procurement functions. Siloed teams produce solutions that fail to integrate with existing service delivery and policy frameworks.',
          },
          {
            text: 'How effectively does your agency manage change associated with AI-driven public service transformation?',
            description: 'Change management in government determines whether AI tools are adopted by civil servants. Without structured change management, even excellent AI will face resistance from established processes.',
          },
          {
            text: 'How receptive are civil servants and program staff at all levels to AI augmentation of their roles?',
            description: 'Public servant receptiveness affects adoption rates. Concerns about job displacement can derail implementations, while engaged staff accelerate value realization and citizen service improvements.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will improve public service delivery and support civil servants?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps staff understand how AI enhances their ability to serve citizens rather than threatening their roles.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your agency identified and prioritized public service processes suitable for AI automation (e.g., case processing, benefits determination)?',
            description: 'Systematic identification ensures AI focuses on high-value government opportunities like automated case processing, benefits eligibility determination, and citizen inquiry routing.',
          },
          {
            text: 'How effectively are AI models integrated into government workflows with human-in-the-loop oversight for decisions affecting citizens?',
            description: 'Human-in-the-loop design in government balances efficiency with due process, ensuring critical decisions about citizen benefits and services receive human oversight while automating routine processing.',
          },
          {
            text: 'Does your agency have established KPIs and feedback loops for measuring AI-powered public service process performance?',
            description: 'Without measurable government outcomes — processing time, accuracy rates, citizen satisfaction, cost per transaction — AI value in public service delivery cannot be assessed.',
          },
          {
            text: 'How mature are your agency\'s practices for continuous improvement and iteration on AI-driven government processes?',
            description: 'Government AI systems must adapt to policy changes, regulatory updates, and evolving citizen needs. Continuous improvement cycles ensure models remain effective and compliant.',
          },
          {
            text: 'To what extent are program and operations teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures government AI systems are maintained, monitored, and improved by teams closest to citizen needs and program requirements.',
          },
        ],
      },
      security: {
        weight: 0.14,
        questions: [
          {
            text: 'How mature are your agency\'s AI-specific security controls for protecting government AI systems and classified information?',
            description: 'Government AI systems face nation-state threats, adversarial manipulation of intelligence analysis, and attacks on critical infrastructure AI. Robust security controls are essential.',
          },
          {
            text: 'How effectively does your agency protect citizen data privacy in AI training and inference processes?',
            description: 'Government AI processes sensitive citizen data including tax records, health information, and social security data. Privacy-preserving techniques and Privacy Act compliance are critical.',
          },
          {
            text: 'To what extent does your agency conduct regular security audits and vulnerability assessments of AI systems handling government data?',
            description: 'Regular audits identify threats to government systems, verify FISMA compliance, and ensure AI systems meet federal security requirements and authorization standards.',
          },
          {
            text: 'Does your agency have robust access controls and audit trails for AI systems processing classified or sensitive government data?',
            description: 'Government access controls enforce need-to-know principles and zero-trust architectures. Audit trails provide accountability and support oversight and investigation requirements.',
          },
          {
            text: 'How well prepared is your agency for government AI security requirements (FISMA, FedRAMP, CMMC, emerging AI national security frameworks)?',
            description: 'Government security readiness is critical — FISMA compliance, FedRAMP authorization for cloud AI, and emerging national security AI frameworks demand proactive cybersecurity measures.',
          },
        ],
      },
    },
  },
  {
    id: 'technology',
    name: 'Technology & Software',
    shortName: 'Technology',
    description: 'Software companies, SaaS providers, platform companies, and tech startups deploying AI for product intelligence, developer productivity, and platform-scale operations.',
    icon: 'Cpu',
    color: '#06b6d4',
    highlights: ['AI-native product features', 'Developer productivity (Copilot)', 'Platform-scale MLOps', 'Data-driven product iteration'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with product vision and market positioning?',
            description: 'A technology company AI strategy must define how AI creates competitive differentiation — whether through AI-native product features, internal productivity gains, or platform capabilities.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI as a core product and engineering capability?',
            description: 'In technology companies, executive AI sponsorship is critical for integrating AI into the product roadmap, allocating engineering resources, and building AI as a first-class platform capability.',
          },
          {
            text: 'How well are AI use cases prioritized based on user value, technical feasibility, and strategic differentiation?',
            description: 'Technology companies must prioritize AI features that create defensible competitive advantages rather than me-too implementations that are easily replicated.',
          },
          {
            text: 'Does your organization have a multi-year AI product roadmap with defined capability milestones and platform evolution targets?',
            description: 'Long-term AI roadmaps in tech must balance product feature delivery with platform capability building, enabling both customer-facing AI features and internal tooling.',
          },
          {
            text: 'How effectively does your organization measure and communicate the impact of AI on product metrics (engagement, retention, revenue)?',
            description: 'Technology company ROI measurement must capture product metrics — user engagement, feature adoption, retention improvements, and revenue attribution — alongside engineering productivity gains.',
          },
        ],
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your product telemetry, user behavior, and operational data?',
            description: 'Technology company data quality is foundational — product telemetry, user event streams, and operational metrics must be reliable for AI to drive product decisions and feature development.',
          },
          {
            text: 'To what extent is your product and operational data accessible across teams in standardized, well-documented formats?',
            description: 'Data accessibility in technology companies requires well-documented data schemas, self-service analytics, and data platforms that enable teams to build AI features without bottlenecks.',
          },
          {
            text: 'Does your organization have mature data governance policies covering user data privacy, retention, and quality standards?',
            description: 'Technology data governance ensures user privacy compliance, data retention policies, and quality standards required for trustworthy AI features and regulatory compliance.',
          },
          {
            text: 'How mature is your data pipeline and streaming infrastructure for supporting real-time product AI and analytics workloads?',
            description: 'Real-time data pipelines enable live product personalization, real-time anomaly detection, and event-driven AI features essential for modern technology platforms.',
          },
          {
            text: 'Does your infrastructure provide scalable compute and storage resources adequate for training large models and serving AI at platform scale?',
            description: 'Technology companies need GPU clusters for model training, scalable inference infrastructure, and data lakehouse architectures to support AI at platform scale.',
          },
        ],
      },
      technology: {
        weight: 0.17,
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for product features, internal tools, and platform capabilities?',
            description: 'A mature technology AI platform provides self-service model training, feature stores, and deployment infrastructure that enables product teams to ship AI features rapidly.',
          },
          {
            text: 'To what extent does your organization practice MLOps at scale (feature stores, model registries, A/B testing, automated retraining)?',
            description: 'Technology company MLOps must operate at platform scale — feature stores, model registries, canary deployments, and continuous evaluation ensure AI features remain performant across millions of users.',
          },
          {
            text: 'How effectively are AI models deployed, versioned, and monitored in production with real-time performance tracking?',
            description: 'Production AI in technology requires sophisticated monitoring — model performance dashboards, automated rollback, and feature flag integration to safely ship AI at velocity.',
          },
          {
            text: 'How well integrated are AI capabilities with your product platform, developer tools, and internal workflows?',
            description: 'Deep integration with the product platform, CI/CD pipelines, and developer workflows amplifies AI impact and enables AI-first development practices across the organization.',
          },
          {
            text: 'Does your organization effectively leverage cloud-native and GPU infrastructure for AI training and inference at scale?',
            description: 'Technology companies need elastic GPU compute for training, edge inference for low-latency features, and cloud-native infrastructure for scalable AI platform services.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML engineering talent to execute product AI and platform AI initiatives?',
            description: 'Technology companies compete intensely for AI engineering talent — ML engineers, research scientists, and AI product managers who can translate research into production features.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling programs for software engineers transitioning to ML and AI-augmented development?',
            description: 'Upskilling software engineers on AI — through internal bootcamps, AI-assisted coding tools, and ML fundamentals training — builds broad AI capability across engineering teams.',
          },
          {
            text: 'How well can your organization attract and retain top AI/ML talent in the highly competitive technology talent market?',
            description: 'Retention in tech AI is exceptionally competitive — FAANG, startups, and research labs all compete for the same talent. Compelling problems, research freedom, and equity are essential.',
          },
          {
            text: 'To what extent do product, design, and engineering teams have AI literacy sufficient to collaborate on AI-powered features?',
            description: 'Technology AI success requires cross-functional collaboration. Product managers and designers must understand AI capabilities and constraints to define feasible, impactful AI features.',
          },
          {
            text: 'Does your organization have defined AI career paths spanning research, applied ML, and AI product management?',
            description: 'Structured AI career ladders — from research scientist to applied ML engineer to AI product manager — increase retention and provide clear growth trajectories for AI professionals.',
          },
        ],
      },
      governance: {
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for product AI decisions and user impacts?',
            description: 'Technology company AI governance must define who is responsible for AI feature outcomes, user safety, and content moderation, ensuring oversight matches the scale of user impact.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in product features across diverse user populations?',
            description: 'Bias in technology product AI can affect millions of users across diverse demographics. Proactive detection and mitigation are essential for equitable product experiences.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for users of AI-powered features?',
            description: 'Technology transparency builds user trust. Features like "Why am I seeing this?" recommendations, AI content labeling, and model cards demonstrate responsible AI deployment.',
          },
          {
            text: 'Are there established processes for AI risk assessment, user impact evaluation, and rapid incident response?',
            description: 'Technology AI risk assessment identifies potential user harms before launch. Rapid incident response ensures swift remediation when AI features produce unexpected or harmful outputs at scale.',
          },
          {
            text: 'How well does your organization comply with technology AI regulations (DMCA, DSA, EU AI Act, state AI laws) and industry best practices?',
            description: 'Technology regulatory compliance is evolving rapidly — the EU AI Act, state-level AI transparency laws, and platform accountability requirements demand proactive legal and technical alignment.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your engineering culture support experimentation, rapid prototyping, and learning from AI feature launches?',
            description: 'Technology companies thrive on experimentation cultures — AI adoption requires rapid prototyping, A/B testing, and data-driven iteration. Cultures that rely solely on intuition miss AI opportunities.',
          },
          {
            text: 'To what extent do product, engineering, research, and design teams collaborate effectively on AI-powered features?',
            description: 'AI product development requires tight collaboration between research, engineering, product, and design. Siloed teams produce technically impressive AI that fails to solve user problems.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven product and engineering transformation?',
            description: 'AI transformation in technology companies shifts engineering practices, product development cycles, and skill requirements. Structured change management ensures teams adapt effectively.',
          },
          {
            text: 'How receptive are engineers and product teams to AI augmentation of their workflows (e.g., AI coding assistants, automated testing)?',
            description: 'Developer receptiveness to AI tools like Copilot, automated code review, and AI-powered testing directly impacts productivity gains. Resistance to AI tooling slows organizational velocity.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will transform the product platform and empower engineering teams?',
            description: 'Clear communication about AI strategy reduces uncertainty, aligns engineering efforts, and helps teams understand how AI creates new product capabilities and career opportunities.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized product and engineering processes suitable for AI augmentation?',
            description: 'Technology process AI opportunities include automated testing, intelligent code review, incident management, customer support automation, and product analytics.',
          },
          {
            text: 'How effectively are AI models integrated into product development workflows with appropriate human oversight?',
            description: 'Human-in-the-loop design in technology balances automation velocity with quality and safety, ensuring AI-generated code, content, and decisions receive appropriate review.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered process improvements?',
            description: 'Technology process metrics — developer velocity, deployment frequency, incident resolution time, feature development cycle time — must be tracked to assess AI impact.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement of AI-driven product and engineering processes?',
            description: 'Technology AI processes must iterate rapidly — models must be retrained on new data, AI features must adapt to user behavior, and tooling must evolve with engineering practices.',
          },
          {
            text: 'To what extent are engineering and product teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership in technology means engineering teams own the AI systems they build — from training to deployment to monitoring — ensuring accountability and rapid iteration.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting AI APIs, model endpoints, and training pipelines?',
            description: 'Technology company AI faces threats including model extraction via API abuse, prompt injection attacks, adversarial inputs to product AI, and training data poisoning.',
          },
          {
            text: 'How effectively does your organization protect user data privacy in AI training, inference, and feature extraction processes?',
            description: 'Technology AI processes massive user datasets. Privacy-preserving techniques (differential privacy, federated learning, data anonymization) are critical for regulatory compliance and user trust.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits and red-team exercises on AI systems?',
            description: 'Red-teaming AI systems identifies vulnerabilities before adversaries do. Regular security audits verify control effectiveness and ensure compliance with platform security standards.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for AI systems processing user data?',
            description: 'Access controls enforce least-privilege access to AI systems and user data. Audit trails provide accountability and support compliance with data protection regulations.',
          },
          {
            text: 'How well prepared is your organization for technology AI security requirements (SOC 2, ISO 27001, EU AI Act, state AI laws)?',
            description: 'Technology compliance is critical — SOC 2 Type II, ISO 27001 certification, and the EU AI Act\'s requirements for high-risk AI systems demand robust security and compliance programs.',
          },
        ],
      },
    },
  },
  {
    id: 'energy',
    name: 'Energy & Utilities',
    shortName: 'Energy',
    description: 'Oil and gas companies, renewable energy providers, utility operators, and grid management organizations deploying AI for asset optimization, safety compliance, and energy transition.',
    icon: 'Database',
    color: '#14b8a6',
    highlights: ['Grid optimization', 'Asset predictive maintenance', 'Safety & compliance', 'Energy demand forecasting'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your organization have a formally documented AI strategy aligned with energy transition goals and operational excellence?',
            description: 'An energy-specific AI strategy must balance traditional operations optimization with energy transition imperatives — ensuring AI investments target both current asset performance and future sustainability goals.',
          },
          {
            text: 'To what extent does executive leadership actively champion and resource AI initiatives for grid modernization and energy optimization?',
            description: 'Executive sponsorship in energy is critical for securing capital for digital infrastructure, navigating regulatory requirements, and ensuring AI projects align with reliability and sustainability mandates.',
          },
          {
            text: 'How well are AI use cases prioritized based on safety impact, reliability improvements, and energy transition value?',
            description: 'Effective prioritization in energy prevents resource dilution across too many pilot projects and focuses effort on high-impact opportunities like grid optimization and predictive maintenance.',
          },
          {
            text: 'Does your organization have a multi-year AI investment roadmap with defined operational and sustainability milestones?',
            description: 'Long-term roadmaps signal commitment to AI-driven energy transformation, enable phased capability building, and provide a framework for measuring reliability and emissions improvements.',
          },
          {
            text: 'How effectively does your organization measure and communicate the ROI of AI initiatives in terms of reliability, safety, and emissions reduction?',
            description: 'Energy ROI measurement must capture reliability metrics (SAIDI/SAIFI), safety improvements, emissions reduction, and operational cost savings alongside financial returns.',
          },
        ],
      },
      data: {
        weight: 0.17,
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your sensor, SCADA, and grid operational data?',
            description: 'Energy data quality is challenging due to legacy SCADA systems, time-series sensor noise, and inconsistent data capture across distributed assets. Poor data quality undermines AI reliability.',
          },
          {
            text: 'To what extent is your operational data accessible across plants, grid regions, and business units in standardized formats?',
            description: 'Siloed energy data prevents cross-asset analysis and model training. Standardized data formats (e.g., IEC 61850, CIM) accelerate AI development and enable benchmarking across sites.',
          },
          {
            text: 'Does your organization have mature data governance policies covering operational data lineage, sensor data ownership, and quality standards?',
            description: 'Energy data governance ensures regulatory compliance for operational data, asset data accountability, and quality standards required for reliable predictive models and grid management.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting real-time grid analytics and AI/ML workloads?',
            description: 'Real-time energy data pipelines enable sub-second grid monitoring, predictive maintenance on critical assets, and demand-response optimization essential for modern grid operations.',
          },
          {
            text: 'Does your infrastructure provide scalable edge and cloud compute resources adequate for energy AI workloads and digital twin simulation?',
            description: 'Energy AI requires edge computing for real-time substation inference, cloud resources for grid-wide optimization models, and digital twin infrastructure for asset simulation.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your organization\'s AI/ML platform ecosystem for grid optimization, asset management, and energy forecasting?',
            description: 'A mature energy AI platform reduces friction in model development, enables edge deployment to substations, and provides standardized environments for operational AI applications.',
          },
          {
            text: 'To what extent does your organization practice MLOps for energy AI (model monitoring, edge deployment, automated retraining on seasonal data)?',
            description: 'Energy MLOps ensures models remain accurate across seasons and operating conditions, enables rapid iteration on grid events, and supports safe deployment at critical infrastructure.',
          },
          {
            text: 'How effectively are AI models deployed into operational technology environments with integration to SCADA, EMS, and DMS systems?',
            description: 'Production-grade energy AI must integrate with SCADA, energy management systems, and distribution management systems. Isolated models deliver limited operational value.',
          },
          {
            text: 'How well integrated are AI capabilities with your existing energy management, asset management, and grid operations workflows?',
            description: 'Deep integration with operational technology systems amplifies AI impact and ensures it augments grid operations and asset management rather than disrupting critical workflows.',
          },
          {
            text: 'Does your organization effectively leverage edge, cloud, or hybrid infrastructure for energy AI workloads and grid-edge intelligence?',
            description: 'Flexible infrastructure enables edge inference for substation automation, cloud-based grid optimization, and hybrid architectures for distributed energy resource management.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your organization have sufficient AI/ML and data engineering talent to execute grid optimization and asset management AI initiatives?',
            description: 'Energy AI talent must understand both machine learning and power systems engineering. Professionals who bridge data science and operational technology are particularly scarce.',
          },
          {
            text: 'How effective are your organization\'s AI upskilling programs for grid operators, asset managers, and energy engineers?',
            description: 'Upskilling existing energy professionals on AI capabilities builds institutional knowledge and ensures AI tools are used effectively within safety-critical operational contexts.',
          },
          {
            text: 'How well can your organization attract and retain AI/ML specialists in the competitive energy technology market?',
            description: 'Energy competes with tech companies for AI talent. Mission-driven recruiting around energy transition and sustainability is essential for attracting specialists.',
          },
          {
            text: 'To what extent do operations, engineering, and IT teams have AI literacy sufficient to collaborate on energy AI initiatives?',
            description: 'Energy AI success requires collaboration between data scientists and power systems engineers. Operators must understand AI capabilities to trust and effectively use AI-driven grid tools.',
          },
          {
            text: 'Does your organization have defined AI career paths bridging power systems engineering and data science roles?',
            description: 'Structured career development for energy AI professionals — such as data-driven reliability engineers and AI-augmented grid operators — increases retention and cross-functional expertise.',
          },
        ],
      },
      governance: {
        weight: 0.14,
        questions: [
          {
            text: 'Does your organization have a formal AI governance framework with clear accountability for AI decisions affecting grid safety and reliability?',
            description: 'Energy AI governance must define who is responsible for AI-driven operational decisions, ensure safety oversight, and create escalation paths for critical infrastructure risks.',
          },
          {
            text: 'How mature are your organization\'s practices for detecting and mitigating AI bias in demand forecasting and resource allocation across service territories?',
            description: 'Bias in energy AI can cause inequitable service delivery across regions and demographics. Proactive detection ensures fair energy access and resource allocation.',
          },
          {
            text: 'To what extent does your organization ensure AI transparency and explainability for regulators and grid operators?',
            description: 'Energy transparency builds trust with regulators and operators. Explainability is critical when AI recommends grid switching actions or load shedding that affects service reliability.',
          },
          {
            text: 'Are there established processes for AI risk assessment, safety impact evaluation, and incident response for energy AI systems?',
            description: 'Energy AI risk assessment identifies potential safety hazards before deployment. Incident response ensures swift remediation when AI-driven systems behave unexpectedly in critical infrastructure.',
          },
          {
            text: 'How well does your organization comply with energy AI safety and reliability regulations (NERC CIP, IEC 61850, emerging grid AI standards)?',
            description: 'Energy regulatory compliance is critical for AI systems that interact with the power grid. Proactive alignment with NERC CIP cybersecurity standards and reliability requirements is mandatory.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your organizational culture support experimentation and learning from AI pilot outcomes in grid and asset operations?',
            description: 'Energy AI adoption requires tolerance for iterative validation in safety-critical environments. Cultures that punish experimentation will struggle to develop and deploy effective operational AI.',
          },
          {
            text: 'To what extent do operations, engineering, IT, and safety teams collaborate effectively on energy AI initiatives?',
            description: 'Energy AI projects span OT, IT, safety, and compliance functions. Siloed teams produce solutions that fail to integrate with operational realities and safety requirements.',
          },
          {
            text: 'How effectively does your organization manage change associated with AI-driven energy operations transformation?',
            description: 'Change management in energy determines whether AI tools are adopted by grid operators and asset managers. Without structured change management, even excellent predictive models will be resisted.',
          },
          {
            text: 'How receptive are energy professionals at all levels to AI augmentation of their operational and safety decision-making roles?',
            description: 'Operator receptiveness affects adoption rates. Concerns about AI replacing human judgment in safety-critical situations can derail implementations if not addressed through training and transparency.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will improve reliability, safety, and energy transition outcomes?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps operators understand how AI enhances their decision-making capabilities rather than undermining their authority.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your organization identified and prioritized energy processes suitable for AI automation (e.g., demand forecasting, outage management, vegetation management)?',
            description: 'Systematic identification ensures AI focuses on high-ROI energy opportunities like demand forecasting, automated outage management, and vegetation management for grid reliability.',
          },
          {
            text: 'How effectively are AI models integrated into energy operations with operator-in-the-loop oversight for safety-critical decisions?',
            description: 'Human-in-the-loop design in energy balances automation efficiency with safety, ensuring critical grid switching and load management decisions receive human oversight while automating routine operations.',
          },
          {
            text: 'Does your organization have established KPIs and feedback loops for measuring AI-powered energy process performance?',
            description: 'Without measurable energy outcomes — SAIDI/SAIFI improvements, forecast accuracy, asset utilization rates, emissions reduction — AI value in grid operations cannot be assessed.',
          },
          {
            text: 'How mature are your organization\'s practices for continuous improvement and iteration on AI-driven energy processes?',
            description: 'Energy AI models must adapt to seasonal demand patterns, renewable generation variability, and grid topology changes. Continuous improvement ensures models remain effective across conditions.',
          },
          {
            text: 'To what extent are operations and engineering teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures energy AI systems are maintained, monitored, and improved by teams closest to grid operations and asset management contexts.',
          },
        ],
      },
      security: {
        weight: 0.14,
        questions: [
          {
            text: 'How mature are your organization\'s AI-specific security controls for protecting grid control systems and operational AI?',
            description: 'Energy AI systems are critical infrastructure targets — nation-state attacks on grid AI, adversarial manipulation of demand forecasts, and OT/IT convergence vulnerabilities require robust defenses.',
          },
          {
            text: 'How effectively does your organization protect operational and customer data privacy in AI training and inference processes?',
            description: 'Energy AI processes smart meter data, customer usage patterns, and operational secrets. Privacy-preserving techniques and regulatory compliance are critical for consumer trust.',
          },
          {
            text: 'To what extent does your organization conduct regular security audits of critical infrastructure AI systems?',
            description: 'Regular audits of energy AI identify threats to grid operations, verify NERC CIP compliance, and ensure AI systems meet critical infrastructure security requirements.',
          },
          {
            text: 'Does your organization have robust access controls and audit trails for AI systems connected to grid control and SCADA systems?',
            description: 'Access controls enforce least-privilege access to critical infrastructure AI, and audit trails provide accountability and support forensic investigation of operational security incidents.',
          },
          {
            text: 'How well prepared is your organization for energy AI cybersecurity requirements (NERC CIP, IEC 62351, national critical infrastructure frameworks)?',
            description: 'Critical infrastructure cybersecurity is mandatory — NERC CIP compliance, IEC 62351 security standards, and national infrastructure protection frameworks require proactive security measures for grid AI.',
          },
        ],
      },
    },
  },
  {
    id: 'education',
    name: 'Education & Research',
    shortName: 'Education',
    description: 'Universities, research institutions, EdTech companies, and educational organizations deploying AI for student outcomes, research acceleration, personalized learning, and institutional operations.',
    icon: 'Users',
    color: '#ec4899',
    highlights: ['Personalized learning', 'Research acceleration', 'Student success prediction', 'Academic integrity'],
    pillarOverrides: {
      strategy: {
        questions: [
          {
            text: 'Does your institution have a formally documented AI strategy aligned with educational mission and research excellence objectives?',
            description: 'An education-specific AI strategy ensures investments target measurable student outcomes, research acceleration, and institutional efficiency rather than ad-hoc experimentation.',
          },
          {
            text: 'To what extent does institutional leadership actively champion and resource AI initiatives for teaching, research, and student services?',
            description: 'Executive sponsorship in education is critical for securing funding, navigating academic governance, and ensuring AI projects align with educational mission and accreditation requirements.',
          },
          {
            text: 'How well are AI use cases prioritized based on student impact, research value, and institutional feasibility?',
            description: 'Effective prioritization in education prevents resource dilution across too many pilot projects and focuses effort on high-impact opportunities like student success prediction and research tools.',
          },
          {
            text: 'Does your institution have a multi-year AI investment roadmap with defined educational and research milestones?',
            description: 'Long-term roadmaps signal commitment, enable phased capability building aligned with academic cycles, and provide a framework for measuring student and research outcomes over time.',
          },
          {
            text: 'How effectively does your institution measure and communicate the impact of AI on student success, research output, and operational efficiency?',
            description: 'Education impact measurement must capture student outcomes (retention, graduation, learning gains), research metrics (publication acceleration, grant success), and operational efficiency.',
          },
        ],
      },
      data: {
        questions: [
          {
            text: 'How would you rate the overall quality, consistency, and completeness of your student, research, and institutional data?',
            description: 'Education data quality challenges include fragmented student information systems, inconsistent learning analytics, and siloed research data repositories. Poor data quality undermines AI effectiveness.',
          },
          {
            text: 'To what extent is your student and research data accessible across departments in standardized formats?',
            description: 'Siloed academic data prevents holistic student support and cross-disciplinary research. Standardized data formats (e.g., LTI, xAPI) accelerate AI development across the institution.',
          },
          {
            text: 'Does your institution have mature data governance policies covering student data privacy (FERPA), research data management, and quality standards?',
            description: 'Education data governance ensures FERPA compliance, IRB-approved data usage, and quality standards required for trustworthy AI in student-facing and research applications.',
          },
          {
            text: 'How mature is your data pipeline infrastructure for supporting learning analytics and research AI workloads?',
            description: 'Education data pipelines must integrate LMS data, student information systems, and research repositories while enabling real-time analytics for student success interventions.',
          },
          {
            text: 'Does your infrastructure provide scalable compute and storage resources adequate for research AI and learning analytics?',
            description: 'Education AI workloads — NLP for research, recommendation engines for learning, and predictive models for student success — require institutional HPC or cloud resources.',
          },
        ],
      },
      technology: {
        questions: [
          {
            text: 'How mature is your institution\'s AI/ML platform ecosystem for learning, research, and administrative applications?',
            description: 'A mature education AI platform reduces friction in model development, enables ethical review workflows, and provides standardized environments for student-facing and research AI.',
          },
          {
            text: 'To what extent does your institution practice MLOps for education AI (model monitoring, bias detection, academic term retraining)?',
            description: 'Education MLOps ensures models remain fair across student cohorts, enables iteration on pedagogical feedback, and supports ethical review requirements for student-facing AI.',
          },
          {
            text: 'How effectively are AI models deployed into learning management systems and student services platforms?',
            description: 'Production-grade education AI must integrate with LMS platforms (Canvas, Blackboard), student information systems, and research computing infrastructure to deliver value.',
          },
          {
            text: 'How well integrated are AI capabilities with your learning management system, research tools, and student support workflows?',
            description: 'Deep integration with academic systems amplifies AI impact and ensures it augments teaching, research, and student support rather than disrupting established academic workflows.',
          },
          {
            text: 'Does your institution effectively leverage cloud, HPC, or hybrid infrastructure for education and research AI workloads?',
            description: 'Education infrastructure must balance cloud scalability for learning analytics with HPC resources for research AI, often within constrained institutional budgets.',
          },
        ],
      },
      talent: {
        questions: [
          {
            text: 'Does your institution have sufficient AI/ML technical talent to execute learning, research, and operational AI initiatives?',
            description: 'Education AI talent must understand both machine learning and pedagogical or research contexts. Faculty who bridge domain expertise and AI capability are particularly valuable.',
          },
          {
            text: 'How effective are your institution\'s AI upskilling programs for faculty, researchers, and administrative staff?',
            description: 'Upskilling faculty and staff on AI capabilities builds institutional knowledge and ensures AI tools are used effectively within pedagogical and research contexts.',
          },
          {
            text: 'How well can your institution attract and retain AI/ML specialists given academic compensation constraints?',
            description: 'Retention challenges in academic AI are significant — industry offers higher compensation. Academic freedom, research opportunities, and impact on education are key retention factors.',
          },
          {
            text: 'To what extent do faculty, researchers, and administrators have AI literacy sufficient to collaborate on AI initiatives?',
            description: 'Education AI success requires collaboration between technologists and educators. Faculty must understand AI capabilities to define effective learning applications and research tools.',
          },
          {
            text: 'Does your institution have defined AI career paths bridging academic, research, and technical roles?',
            description: 'Structured career development for academic AI professionals — such as AI-teaching fellows and research software engineers — increases retention and fosters cross-functional expertise.',
          },
        ],
      },
      governance: {
        weight: 0.17,
        questions: [
          {
            text: 'Does your institution have a formal AI governance framework with clear accountability for student-facing AI and research integrity?',
            description: 'Education AI governance must define who is responsible for AI decisions affecting students, ensure academic oversight, and maintain research integrity standards.',
          },
          {
            text: 'How mature are your institution\'s practices for detecting and mitigating AI bias in student assessment, admissions, and support algorithms?',
            description: 'Bias in education AI can cause discriminatory outcomes in grading, admissions, and student support. Proactive detection and mitigation are essential for equitable educational opportunities.',
          },
          {
            text: 'To what extent does your institution ensure AI transparency and explainability for students, faculty, and accrediting bodies?',
            description: 'Educational transparency builds trust with students and accreditors. Students must understand how AI influences their learning experience, and faculty must be able to explain AI-assisted decisions.',
          },
          {
            text: 'Are there established processes for AI risk assessment, student impact evaluation, and academic integrity incident response?',
            description: 'Education AI risk assessment identifies potential harms to students before deployment. Incident response ensures swift remediation when AI systems produce unfair or incorrect academic outcomes.',
          },
          {
            text: 'How well does your institution comply with education AI regulations (FERPA, Title IX, ADA, EU AI Act for education) and accreditation standards?',
            description: 'Educational regulatory compliance is mandatory. Proactive alignment with FERPA, accessibility requirements, and the EU AI Act\'s education provisions ensures legal and ethical AI deployment.',
          },
        ],
      },
      culture: {
        questions: [
          {
            text: 'How strongly does your institutional culture support experimentation and learning from AI pilot outcomes in teaching and research?',
            description: 'Education AI adoption requires tolerance for iterative pedagogical experimentation. Institutions that resist change will struggle to develop effective AI-enhanced learning experiences.',
          },
          {
            text: 'To what extent do faculty, IT, research, and student services teams collaborate effectively on AI initiatives?',
            description: 'Education AI projects span teaching, technology, research, and student support functions. Siloed teams produce solutions that fail to integrate with pedagogical realities and student needs.',
          },
          {
            text: 'How effectively does your institution manage change associated with AI-driven educational transformation?',
            description: 'Change management in education determines whether AI tools are adopted by faculty and embraced by students. Without structured change management, even excellent AI will face academic resistance.',
          },
          {
            text: 'How receptive are faculty and students to AI augmentation of teaching, learning, and assessment?',
            description: 'Faculty receptiveness affects adoption rates. Concerns about AI undermining academic integrity or devaluing teaching can derail implementations if not addressed through dialogue and governance.',
          },
          {
            text: 'Does leadership communicate a clear vision for how AI will enhance educational quality and support academic freedom?',
            description: 'Clear communication reduces uncertainty, builds buy-in, and helps the academic community understand how AI enhances educational quality while preserving academic values.',
          },
        ],
      },
      process: {
        questions: [
          {
            text: 'To what extent has your institution identified and prioritized educational processes suitable for AI augmentation (e.g., personalized learning, automated assessment, research support)?',
            description: 'Systematic identification ensures AI focuses on high-value educational opportunities like adaptive learning, automated feedback, and AI-assisted research tools.',
          },
          {
            text: 'How effectively are AI models integrated into educational workflows with faculty-in-the-loop oversight for academic decisions?',
            description: 'Human-in-the-loop design in education balances automation with academic judgment, ensuring critical grading, admissions, and support decisions receive faculty oversight while automating routine tasks.',
          },
          {
            text: 'Does your institution have established KPIs and feedback loops for measuring AI-powered educational process performance?',
            description: 'Without measurable educational outcomes — student retention, learning gains, research output acceleration, time-to-feedback — AI value in education cannot be assessed.',
          },
          {
            text: 'How mature are your institution\'s practices for continuous improvement and iteration on AI-driven educational processes?',
            description: 'Educational AI must adapt to changing curricula, student demographics, and pedagogical approaches. Continuous improvement ensures AI tools remain effective across academic terms.',
          },
          {
            text: 'To what extent are faculty and student services teams equipped and empowered to manage AI systems day-to-day?',
            description: 'Operational ownership ensures educational AI systems are maintained, monitored, and improved by teams closest to student needs and pedagogical contexts.',
          },
        ],
      },
      security: {
        questions: [
          {
            text: 'How mature are your institution\'s AI-specific security controls for protecting student data and academic integrity systems?',
            description: 'Education AI faces threats including academic dishonesty using AI, attacks on student data, and manipulation of assessment systems. Robust security controls protect both data and integrity.',
          },
          {
            text: 'How effectively does your institution protect student data privacy (FERPA) in AI training and inference processes?',
            description: 'Educational AI processes sensitive student records including grades, financial aid, and personal information. FERPA compliance and privacy-preserving techniques are critical.',
          },
          {
            text: 'To what extent does your institution conduct regular security audits of AI systems handling student and research data?',
            description: 'Regular audits identify threats to student data, verify FERPA compliance, and ensure AI systems meet institutional security and data protection standards.',
          },
          {
            text: 'Does your institution have robust access controls and audit trails for AI systems processing student and research data?',
            description: 'Access controls enforce FERPA-appropriate access to student data, and audit trails provide accountability and support compliance with institutional data governance policies.',
          },
          {
            text: 'How well prepared is your institution for education AI security requirements (FERPA, GLBA, ADA accessibility, EU AI Act for education)?',
            description: 'Educational compliance is mandatory — FERPA privacy requirements, accessibility standards for AI tools, and the EU AI Act\'s high-risk classification for education AI require proactive measures.',
          },
        ],
      },
    },
  },
  {
    id: 'general',
    name: 'General / Cross-Industry',
    shortName: 'General',
    description: 'Organizations that span multiple industries or prefer a general-purpose AI readiness assessment using standard, industry-agnostic questions across all eight pillars.',
    icon: 'ClipboardList',
    color: '#8b949e',
    highlights: ['Industry-agnostic baseline', 'Universal readiness framework', 'Cross-sector benchmarking', 'Foundational assessment'],
    pillarOverrides: {}, // Uses base pillar questions (no overrides)
  },
];

// ─── Helper functions ────────────────────────────────────────────────────────

export function getSectorById(id: string): SectorDefinition | undefined {
  return SECTORS.find(s => s.id === id);
}

export function getSectorPillarQuestions(
  sectorId: string,
  pillarId: string
): SectorQuestionOverride[] | null {
  const sector = getSectorById(sectorId);
  if (!sector) return null;

  const override = sector.pillarOverrides[pillarId];
  if (!override || !override.questions) return null;

  return override.questions;
}

/**
 * Get the effective questions for a pillar in a given sector.
 * Falls back to base pillar questions if no sector override exists.
 */
export function getEffectivePillarQuestions(
  sectorId: string | null | undefined,
  pillarId: string
): Array<{ id: string; text: string; description: string; type: 'likert'; required: boolean }> {
  const pillar = getPillarById(pillarId);
  if (!pillar) return [];

  // If no sector selected, use base questions
  if (!sectorId || sectorId === 'general') {
    return pillar.questions;
  }

  const overrides = getSectorPillarQuestions(sectorId, pillarId);
  if (!overrides) {
    return pillar.questions;
  }

  // Merge: override text/description, keep same IDs
  return pillar.questions.map((baseQ, idx) => {
    const override = overrides[idx];
    if (override) {
      return {
        ...baseQ,
        text: override.text,
        description: override.description,
      };
    }
    return baseQ;
  });
}

/**
 * Get the effective weight for a pillar in a given sector.
 * Falls back to base pillar weight if no sector override exists.
 */
export function getEffectivePillarWeight(sectorId: string | null | undefined, pillarId: string): number {
  const pillar = getPillarById(pillarId);
  if (!pillar) return 0;

  if (!sectorId || sectorId === 'general') {
    return pillar.weight;
  }

  const sector = getSectorById(sectorId);
  if (!sector) return pillar.weight;

  const override = sector.pillarOverrides[pillarId];
  if (override && override.weight !== undefined) {
    return override.weight;
  }

  return pillar.weight;
}

/**
 * Get all pillars with sector-specific questions and weights applied.
 */
export function getSectorAdjustedPillars(sectorId: string | null | undefined): PillarDefinition[] {
  return PILLARS.map(pillar => ({
    ...pillar,
    questions: getEffectivePillarQuestions(sectorId, pillar.id),
    weight: getEffectivePillarWeight(sectorId, pillar.id),
  }));
}

// Re-import getPillarById locally for the helper functions
import { getPillarById } from './pillars';
