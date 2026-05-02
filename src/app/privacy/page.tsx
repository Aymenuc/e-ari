'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield,
  Lock,
  Eye,
  Database,
  Bell,
  Users,
  Globe,
  Server,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'

/* ─── Animation helper ─────────────────────────────────────────────────── */

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
  )
}

/* ─── Section component ────────────────────────────────────────────────── */

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <FadeUp>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-eari-blue/15 flex-shrink-0">
            <Icon className="h-4.5 w-4.5 text-eari-blue-light" />
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="text-muted-foreground font-sans leading-relaxed space-y-4 pl-0 sm:pl-12">
          {children}
        </div>
      </FadeUp>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIVACY POLICY PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ─── HERO ────────────────────────────────────────────────────── */}
        <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="mesh-blob absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="mesh-blob absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)', animationDelay: '-7s' }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeUp>
              <Badge variant="outline" className="mb-4 font-mono text-xs border-border/60 text-muted-foreground/80 bg-navy-800/50">
                Legal
              </Badge>
            </FadeUp>
            <FadeUp delay={0.05}>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Privacy Policy
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                How E-ARI collects, uses, stores, and protects your data. We believe transparency in data practices is as important as transparency in scoring methodology.
              </p>
            </FadeUp>
            <FadeUp delay={0.15}>
              <p className="mt-2 text-sm text-muted-foreground/70 font-mono">
                Last updated: April 20, 2026 &middot; Version 1.0
              </p>
            </FadeUp>
          </div>
        </section>

        {/* ─── QUICK NAV ────────────────────────────────────────────────── */}
        <section className="pb-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <Card className="bg-navy-800 border-border/60">
                <CardContent className="p-6">
                  <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Table of Contents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'overview', label: '1. Overview' },
                      { id: 'collection', label: '2. Information We Collect' },
                      { id: 'usage', label: '3. How We Use Your Information' },
                      { id: 'ai-processing', label: '4. AI Processing & LLM Usage' },
                      { id: 'sharing', label: '5. Data Sharing & Disclosure' },
                      { id: 'storage', label: '6. Data Storage & Security' },
                      { id: 'retention', label: '7. Data Retention' },
                      { id: 'rights', label: '8. Your Rights & Choices' },
                      { id: 'cookies', label: '9. Cookies & Tracking' },
                      { id: 'children', label: '10. Children\'s Privacy' },
                      { id: 'international', label: '11. International Transfers' },
                      { id: 'changes', label: '12. Changes to This Policy' },
                      { id: 'contact', label: '13. Contact Us' },
                    ].map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="text-sm text-eari-blue-light hover:text-eari-blue-light/80 font-sans transition-colors py-1"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </section>

        {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-14">

            {/* 1. Overview */}
            <Section id="overview" icon={Eye} title="1. Overview">
              <p>
                E-ARI (Enterprise AI Readiness Assessment) is a platform operated by E-ARI that enables organizations to assess their preparedness for AI adoption across eight strategic pillars: Strategy & Vision, Data & Infrastructure, Talent & Culture, Governance & Ethics, Technology & Tools, Process & Operations, Customer & Market, and Innovation & Agility. This Privacy Policy describes how we collect, use, disclose, and protect information when you use our platform at e-ari.com and any associated subdomains, APIs, and services.
              </p>
              <p>
                By accessing or using E-ARI, you agree to the data practices described in this policy. If you are using E-ARI on behalf of an organization, you represent that you have the authority to bind that organization to this policy. We encourage you to read this document carefully and review it periodically, as we may update it from time to time. When we make material changes, we will notify you through the platform or by email before the changes take effect.
              </p>
              <p>
                Our approach to privacy is guided by the same principles that underpin our assessment methodology: transparency, rigor, and accountability. We do not sell your data. We do not use your assessment responses to train AI models for third parties. And we design our data architecture so that only the minimum information necessary is processed at each stage of the assessment pipeline.
              </p>
            </Section>

            {/* 2. Information We Collect */}
            <Section id="collection" icon={Database} title="2. Information We Collect">
              <p>
                We collect information that you provide directly, information generated through your use of the platform, and technical information collected automatically. Each category serves a distinct purpose in delivering the assessment experience and generating your results.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">2.1 Information You Provide</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Account information:</span> Full name, email address, organization name, job title, industry sector, and password (stored as a bcrypt hash). This information is necessary to create and manage your account and to tailor assessment outputs to your organizational context.</li>
                <li><span className="text-foreground font-medium">Assessment responses:</span> Your answers to the 8-pillar assessment questionnaire, including selected options for each question, free-text elaborations, and any clarifying notes. These responses form the foundation for all scoring, insights, and recommendations generated by the platform.</li>
                <li><span className="text-foreground font-medium">Organization details:</span> Organization size, sector, geographic region, and current AI initiatives. This context enables the Discovery Agent and benchmark comparisons to produce sector-relevant outputs rather than generic advice.</li>
                <li><span className="text-foreground font-medium">Payment information:</span> When you subscribe to the Professional ($29/month) or Enterprise (custom pricing) plan, we collect billing details through our payment processor. E-ARI does not store credit card numbers on our servers; they are handled exclusively by our PCI-compliant payment provider.</li>
                <li><span className="text-foreground font-medium">Communication preferences:</span> Your opt-in choices for product updates, assessment reminders, and marketing communications.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">2.2 Information Generated by the Platform</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Assessment scores:</span> Calculated pillar scores (0-100), overall readiness score, maturity band classifications (Emerging, Developing, Established, Leading), and weighted adjustments generated by the Scoring Agent using deterministic methodology (Scoring v5.3).</li>
                <li><span className="text-foreground font-medium">AI-generated insights:</span> Strategic narratives produced by the Insight Agent, organizational landscape analysis from the Discovery Agent, learning path recommendations from the Literacy Agent, and interactive Q&A responses from the Assistant Agent. These are generated by large language models (LLMs) processing your assessment data.</li>
                <li><span className="text-foreground font-medium">Reports:</span> PDF reports compiled by the Report Agent, including executive summaries, benchmark comparisons, roadmaps, and strategic recommendations.</li>
                <li><span className="text-foreground font-medium">Benchmark data:</span> Sector-specific benchmarks generated from our curated dataset covering eight industry sectors (Financial Services, Healthcare, Manufacturing, Retail, Technology, Government, Energy, Education). Your anonymized scores may contribute to aggregate benchmark statistics.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">2.3 Automatically Collected Information</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Usage data:</span> Pages visited, features used, time spent on assessments, click patterns, and navigation paths. This helps us understand how users interact with the platform and identify areas for improvement.</li>
                <li><span className="text-foreground font-medium">Device and browser information:</span> Browser type and version, operating system, screen resolution, device type, and IP address. This ensures the platform renders correctly and helps detect unauthorized access.</li>
                <li><span className="text-foreground font-medium">Performance metrics:</span> Agent pipeline execution times, API response latencies, and error rates. These operational metrics help us maintain platform reliability and performance.</li>
              </ul>
            </Section>

            {/* 3. How We Use Your Information */}
            <Section id="usage" icon={FileText} title="3. How We Use Your Information">
              <p>
                We use the information we collect for the following purposes, each of which is necessary to deliver the E-ARI service or required by law:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Delivering assessments:</span> Processing your questionnaire responses through the 6-agent pipeline (Scoring, Insight, Discovery, Report, Literacy, Assistant) to generate pillar scores, strategic narratives, benchmark comparisons, roadmaps, and PDF reports.</li>
                <li><span className="text-foreground font-medium">Account management:</span> Creating and maintaining your account, authenticating your identity, managing subscriptions (Starter, Professional, Enterprise tiers), and processing payments.</li>
                <li><span className="text-foreground font-medium">Personalization:</span> Tailoring assessment questions, insights, benchmarks, and recommendations to your sector, organization size, and maturity level. Without this contextual information, agents would produce generic outputs that do not reflect your organization's actual readiness landscape.</li>
                <li><span className="text-foreground font-medium">Platform improvement:</span> Analyzing usage patterns to improve question design, scoring methodology, agent accuracy, user interface, and overall platform performance. We use aggregated and anonymized data for these purposes whenever possible.</li>
                <li><span className="text-foreground font-medium">Communication:</span> Sending assessment results, account notifications, security alerts, and (with your consent) product updates and marketing communications. You can manage your communication preferences at any time from your account settings.</li>
                <li><span className="text-foreground font-medium">Security and fraud prevention:</span> Detecting unauthorized access, preventing abuse, and protecting the integrity of assessment results and scoring methodology.</li>
                <li><span className="text-foreground font-medium">Legal compliance:</span> Fulfilling legal obligations, responding to lawful requests from public authorities, and enforcing our terms of service.</li>
              </ul>
            </Section>

            {/* 4. AI Processing & LLM Usage */}
            <Section id="ai-processing" icon={Server} title="4. AI Processing & LLM Usage">
              <p>
                E-ARI uses large language models (LLMs) to power four of its six AI agents: the Insight Agent, the Discovery Agent, the Literacy Agent, and the Assistant Agent. This section explains how your data interacts with these models and the safeguards we have implemented.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.1 What Is Sent to LLMs</h3>
              <p>
                When your assessment is processed, the following data is included in prompts sent to our LLM provider: your pillar scores, per-question answer details (selected options and any free-text responses), your organization's sector and size, and the assessment context. This information is necessary for the agents to produce contextually relevant, organization-specific analysis rather than generic outputs. Without per-question detail, agents would have no basis for differentiated insights.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.2 LLM Provider and Data Handling</h3>
              <p>
                We use OpenAI as our LLM provider. Under our agreement with OpenAI, data sent through the API is not used to train or improve their models. Prompts and completions are retained by OpenAI for a maximum of 30 days for abuse monitoring purposes, after which they are permanently deleted. We do not use OpenAI consumer-facing products (such as ChatGPT) for processing your assessment data; all processing occurs through the enterprise API.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.3 What Is NOT Sent to LLMs</h3>
              <p>
                The Scoring Agent and Report Agent operate deterministically and do not send data to LLMs. The Scoring Agent calculates pillar scores using a fixed, auditable methodology (Methodology v5.3) with no AI involvement. The Report Agent compiles pre-generated content into PDF format without LLM processing. Additionally, we never send your email address, password, payment information, or personally identifiable contact details to LLM providers as part of assessment processing.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.4 AI-Generated Content Labeling</h3>
              <p>
                All content generated by LLM-powered agents is clearly labeled as AI-generated within the platform. This includes insight narratives, discovery analysis, literacy recommendations, and assistant responses. We believe in transparency: you should always know whether a piece of content was calculated by deterministic methodology or generated by an AI model. Scores are never altered by AI; LLM-generated content is supplementary narrative that helps interpret the scores.
              </p>
            </Section>

            {/* 5. Data Sharing & Disclosure */}
            <Section id="sharing" icon={Users} title="5. Data Sharing & Disclosure">
              <p>
                We do not sell, rent, or trade your personal information or assessment data to third parties. We share information only in the following specific circumstances:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">LLM providers:</span> As described in Section 4, assessment responses and context are sent to OpenAI for agent processing. This data is subject to OpenAI's enterprise API data policies and is not used for model training.</li>
                <li><span className="text-foreground font-medium">Payment processors:</span> Billing information is processed by our PCI-compliant payment provider. We do not store full credit card numbers on our infrastructure.</li>
                <li><span className="text-foreground font-medium">Infrastructure providers:</span> We use cloud hosting providers for application hosting, database storage, and file storage. These providers are contractually obligated to process data only as instructed by E-ARI and maintain appropriate security certifications (SOC 2, ISO 27001).</li>
                <li><span className="text-foreground font-medium">Enterprise customers:</span> If your organization has an Enterprise agreement, designated administrators within your organization may access aggregate assessment data and usage analytics for users within that organization. Individual assessment responses are not shared with organization administrators unless you explicitly opt in.</li>
                <li><span className="text-foreground font-medium">Legal requirements:</span> We may disclose information when required by law, regulation, legal process, or governmental request. We will notify you of such disclosure unless we are legally prohibited from doing so.</li>
                <li><span className="text-foreground font-medium">Business transfers:</span> In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred to the acquiring entity. We will notify you via email and update this policy before any such transfer occurs.</li>
              </ul>
            </Section>

            {/* 6. Data Storage & Security */}
            <Section id="storage" icon={Lock} title="6. Data Storage & Security">
              <p>
                We implement industry-standard security measures to protect your information from unauthorized access, disclosure, alteration, and destruction. Our security practices are designed to meet enterprise and government-grade requirements.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.1 Encryption</h3>
              <p>
                All data in transit is encrypted using TLS 1.3. All data at rest is encrypted using AES-256 encryption. Database backups are encrypted and stored in geographically separate locations. Encryption keys are managed through a dedicated key management service with regular rotation schedules.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.2 Access Controls</h3>
              <p>
                Access to production systems and databases is restricted to authorized personnel on a least-privilege basis. All access is logged and audited. Engineers cannot view individual assessment responses without explicit authorization and a documented business need. We use multi-factor authentication for all administrative access.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.3 Infrastructure Security</h3>
              <p>
                Our infrastructure is hosted on cloud providers that maintain SOC 2 Type II and ISO 27001 certifications. We perform regular vulnerability assessments, penetration testing, and security audits. Our application undergoes code review and security scanning as part of the development pipeline.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.4 Incident Response</h3>
              <p>
                We maintain an incident response plan and will notify affected users within 72 hours of discovering a data breach that poses a risk to their rights and freedoms, in accordance with applicable data protection laws. Notifications will include the nature of the breach, the data affected, and the steps we are taking to remediate it.
              </p>
            </Section>

            {/* 7. Data Retention */}
            <Section id="retention" icon={Database} title="7. Data Retention">
              <p>
                We retain your information for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes, and enforce our agreements. Specific retention periods are as follows:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Account data:</span> Retained for the duration of your account. Upon account deletion, personal information is removed within 30 days, except where retention is required by law.</li>
                <li><span className="text-foreground font-medium">Assessment responses and results:</span> Retained for the duration of your account plus 90 days, allowing you to access historical assessments and trend analysis. After this period, assessment data is permanently deleted.</li>
                <li><span className="text-foreground font-medium">AI-generated content:</span> Retained alongside the associated assessment for the same period. When an assessment is deleted, all associated AI-generated insights, reports, and narratives are also deleted.</li>
                <li><span className="text-foreground font-medium">Usage and analytics data:</span> Anonymized and aggregated within 90 days of collection. Raw usage logs are deleted after 180 days.</li>
                <li><span className="text-foreground font-medium">Payment records:</span> Retained for 7 years as required by financial regulations and tax compliance obligations.</li>
                <li><span className="text-foreground font-medium">LLM prompts and completions:</span> Not stored by E-ARI beyond the duration of the API request. OpenAI retains API data for up to 30 days for abuse monitoring, after which it is permanently deleted from their systems.</li>
              </ul>
            </Section>

            {/* 8. Your Rights & Choices */}
            <Section id="rights" icon={Shield} title="8. Your Rights & Choices">
              <p>
                Depending on your jurisdiction, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Access:</span> You can request a copy of the personal information we hold about you, including your assessment responses, scores, and AI-generated content. You can access most of this information directly from your account dashboard.</li>
                <li><span className="text-foreground font-medium">Rectification:</span> You can update your account information at any time. If you believe assessment results contain errors due to inaccurate input data, you can retake the assessment with corrected responses.</li>
                <li><span className="text-foreground font-medium">Erasure:</span> You can request deletion of your account and all associated data. Upon confirmation, we will delete your personal information within 30 days, except where retention is required by law (such as financial records).</li>
                <li><span className="text-foreground font-medium">Portability:</span> You can export your assessment results, scores, and reports in machine-readable formats (JSON, PDF) from your account dashboard.</li>
                <li><span className="text-foreground font-medium">Objection:</span> You can object to the processing of your data for direct marketing purposes by updating your communication preferences. For other processing activities, you may object on grounds relating to your particular situation.</li>
                <li><span className="text-foreground font-medium">Restriction:</span> You can request that we restrict the processing of your data in certain circumstances, such as when you contest the accuracy of the data or object to processing based on legitimate interests.</li>
                <li><span className="text-foreground font-medium">Automated decision-making:</span> E-ARI's scoring methodology is deterministic and auditable, not automated decision-making in the legal sense. AI-generated insights are supplementary narratives and do not make decisions about you. You have the right to be informed about the logic involved in scoring and insight generation.</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at privacy@e-ari.com. We will respond to your request within 30 days. If we are unable to comply with your request, we will explain why.
              </p>
            </Section>

            {/* 9. Cookies & Tracking */}
            <Section id="cookies" icon={Bell} title="9. Cookies & Tracking">
              <p>
                E-ARI uses cookies and similar tracking technologies for the following purposes:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Essential cookies:</span> Required for authentication, session management, and security (e.g., CSRF protection). These cannot be disabled without breaking core platform functionality.</li>
                <li><span className="text-foreground font-medium">Functional cookies:</span> Store your preferences such as theme settings, language, and assessment progress. These enhance your experience but are not strictly necessary.</li>
                <li><span className="text-foreground font-medium">Analytics cookies:</span> Help us understand how users interact with the platform, including page views, feature usage, and error rates. We use anonymized data and do not track individual users across sessions for advertising purposes.</li>
              </ul>
              <p>
                We do not use advertising cookies or sell data to advertising networks. You can manage your cookie preferences through the cookie banner displayed on your first visit or through your browser settings. Disabling certain cookies may affect the functionality of the platform.
              </p>
            </Section>

            {/* 10. Children's Privacy */}
            <Section id="children" icon={Users} title="10. Children's Privacy">
              <p>
                E-ARI is a professional platform designed for organizations assessing their AI readiness. Our services are not directed at individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal data from a person under 18, we will take steps to delete that information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at privacy@e-ari.com.
              </p>
            </Section>

            {/* 11. International Transfers */}
            <Section id="international" icon={Globe} title="11. International Data Transfers">
              <p>
                E-ARI operates globally and your data may be transferred to and processed in countries other than your country of residence. We ensure that all international transfers are protected by appropriate safeguards, including Standard Contractual Clauses approved by the European Commission, adequacy decisions, or other legally recognized transfer mechanisms. When data is transferred to our LLM provider (OpenAI), appropriate safeguards are in place as described in our Data Processing Agreement.
              </p>
              <p>
                For users in the European Economic Area (EEA), United Kingdom, and Switzerland, we comply with the General Data Protection Regulation (GDPR) and applicable local data protection laws. Our legal basis for processing includes: performance of the contract (delivering assessment services), legitimate interests (platform improvement and security), consent (marketing communications), and legal obligations (financial record retention).
              </p>
            </Section>

            {/* 12. Changes to This Policy */}
            <Section id="changes" icon={FileText} title="12. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by posting a prominent notice on the platform, sending an email to the address associated with your account, or both. The updated policy will be effective as of the "Last updated" date shown at the top of this page.
              </p>
              <p>
                We encourage you to review this policy periodically. Your continued use of E-ARI after any changes constitutes your acceptance of the updated policy. If you do not agree with the changes, you may close your account by contacting us at privacy@e-ari.com.
              </p>
            </Section>

            {/* 13. Contact Us */}
            <Section id="contact" icon={Bell} title="13. Contact Us">
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us using any of the following methods:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Email:</span> privacy@e-ari.com</li>
                <li><span className="text-foreground font-medium">Data Protection Officer:</span> dpo@e-ari.com</li>
                <li><span className="text-foreground font-medium">Mailing address:</span> E-ARI, Attn: Privacy Team</li>
              </ul>
              <p>
                For EU/EEA residents: If you believe that our processing of your personal data violates the GDPR, you have the right to lodge a complaint with your local supervisory authority. We are committed to resolving any concerns you may have and encourage you to contact us before filing a formal complaint.
              </p>
            </Section>

          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────────────────── */}
        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <Card className="bg-navy-800 border-border/60">
                <CardContent className="p-8 sm:p-12 text-center">
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    Questions About Your Data?
                  </h2>
                  <p className="text-muted-foreground font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                    We take data privacy as seriously as we take scoring methodology. If you have any questions about how your data is handled, our team is ready to help.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="mailto:privacy@e-ari.com">
                      <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
                        Contact Privacy Team
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>
                    <Link href="/data-processing">
                      <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading min-h-[44px]">
                        Data Processing Agreement
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
