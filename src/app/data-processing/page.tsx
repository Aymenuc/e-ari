'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield,
  Database,
  Lock,
  Server,
  FileCheck,
  Globe,
  ArrowRight,
  AlertCircle,
  ClipboardList,
  Clock,
  UserCheck,
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
   DATA PROCESSING AGREEMENT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DataProcessingPage() {
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
                Data Processing Agreement
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                This Data Processing Agreement (DPA) forms part of the Terms of Service and governs the processing of personal data by E-ARI on behalf of its users.
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
                      { id: 'scope', label: '1. Scope & Applicability' },
                      { id: 'definitions', label: '2. Definitions' },
                      { id: 'roles', label: '3. Roles of the Parties' },
                      { id: 'categories', label: '4. Categories of Data' },
                      { id: 'obligations', label: '5. Processor Obligations' },
                      { id: 'subprocessors', label: '6. Sub-Processors' },
                      { id: 'security', label: '7. Security Measures' },
                      { id: 'breach', label: '8. Data Breach Notification' },
                      { id: 'rights-support', label: '9. Data Subject Rights Support' },
                      { id: 'audits', label: '10. Audits & Compliance' },
                      { id: 'transfers', label: '11. International Data Transfers' },
                      { id: 'retention-dpa', label: '12. Data Retention & Deletion' },
                      { id: 'liability', label: '13. Liability & Indemnification' },
                      { id: 'dpa-contact', label: '14. Contact & DPA Requests' },
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

            {/* 1. Scope & Applicability */}
            <Section id="scope" icon={ClipboardList} title="1. Scope & Applicability">
              <p>
                This Data Processing Agreement ("DPA") applies to the processing of personal data by E-ARI ("Processor," "we," "us") on behalf of the user or organization ("Controller," "you") in connection with your use of the E-ARI platform. This DPA is incorporated into and forms part of the Terms of Service. By using the Service, you agree to the terms of this DPA.
              </p>
              <p>
                This DPA is designed to comply with the requirements of the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other applicable data protection laws. Where these laws impose different or additional requirements, the stricter standard applies. For Enterprise customers with custom DPA requirements, the terms of the executed Enterprise Agreement shall prevail to the extent of any conflict.
              </p>
            </Section>

            {/* 2. Definitions */}
            <Section id="definitions" icon={FileCheck} title="2. Definitions">
              <p>The following definitions apply throughout this DPA:</p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">"Personal Data":</span> Any information relating to an identified or identifiable natural person that is processed by E-ARI in the course of providing the Service. This includes user account information and assessment responses that may contain personal identifiers.</li>
                <li><span className="text-foreground font-medium">"Processing":</span> Any operation or set of operations performed on Personal Data, whether or not by automated means, including collection, recording, organization, structuring, storage, adaptation, alteration, retrieval, consultation, use, disclosure, dissemination, alignment, combination, restriction, erasure, or destruction.</li>
                <li><span className="text-foreground font-medium">"Controller":</span> The user or organization that determines the purposes and means of the processing of Personal Data. When you create an account and submit assessment data, you act as the Controller.</li>
                <li><span className="text-foreground font-medium">"Processor":</span> E-ARI, which processes Personal Data on behalf of the Controller in the course of providing the Service.</li>
                <li><span className="text-foreground font-medium">"Sub-Processor":</span> Any third party engaged by E-ARI to process Personal Data on behalf of the Controller as part of the Service delivery.</li>
                <li><span className="text-foreground font-medium">"Data Subject":</span> An identified or identifiable natural person whose Personal Data is processed.</li>
                <li><span className="text-foreground font-medium">"Data Protection Laws":</span> The GDPR, CCPA, and any other applicable data protection or privacy laws in the jurisdiction(s) where the Controller operates.</li>
              </ul>
            </Section>

            {/* 3. Roles of the Parties */}
            <Section id="roles" icon={UserCheck} title="3. Roles of the Parties">
              <p>
                You (the user or organization) are the Controller of the Personal Data submitted to and generated by the Service. You determine the purposes for which Personal Data is processed, including why you are conducting AI readiness assessments and how you use the results.
              </p>
              <p>
                E-ARI acts as the Processor, processing Personal Data only on your instructions and for the purposes described in the Terms of Service and this DPA. We do not process your Personal Data for our own purposes beyond what is necessary to provide the Service, maintain platform security, and comply with legal obligations. Specifically, we do not use your assessment data or AI-generated outputs for marketing, advertising, or product training purposes.
              </p>
              <p>
                In certain limited circumstances, E-ARI may act as a Controller in its own right with respect to certain categories of data, such as operational metadata (server logs, performance metrics) and aggregate anonymized statistics used for benchmarking. In such cases, the processing is governed by our Privacy Policy rather than this DPA.
              </p>
            </Section>

            {/* 4. Categories of Data */}
            <Section id="categories" icon={Database} title="4. Categories of Data Processed">
              <p>
                The following categories of Personal Data are processed by E-ARI in the course of providing the Service:
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.1 Data Provided by the Controller</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Identity data:</span> Full name, job title, and professional contact information of the account holder and designated team members.</li>
                <li><span className="text-foreground font-medium">Contact data:</span> Email address, phone number (if provided), and mailing address (Enterprise customers only).</li>
                <li><span className="text-foreground font-medium">Organization data:</span> Organization name, size, sector, geographic region, and information about current AI initiatives that may include references to identifiable individuals.</li>
                <li><span className="text-foreground font-medium">Assessment responses:</span> Answers to the 8-pillar questionnaire, including selected options, free-text elaborations, and notes. These responses may contain personal opinions, organizational details, or references to identifiable colleagues.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.2 Data Generated by Processing</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Scoring outputs:</span> Pillar scores (0-100), overall readiness scores, maturity band classifications, and weighted adjustments produced by the deterministic Scoring Agent (Methodology v5.3).</li>
                <li><span className="text-foreground font-medium">AI-generated narratives:</span> Strategic insights, gap analyses, competitive positioning assessments, learning path recommendations, and Q&A responses produced by the Insight, Discovery, Literacy, and Assistant agents using large language models.</li>
                <li><span className="text-foreground font-medium">Reports:</span> PDF documents compiled by the Report Agent containing executive summaries, benchmark comparisons, roadmaps, and strategic recommendations.</li>
                <li><span className="text-foreground font-medium">Benchmark comparisons:</span> Sector-specific comparisons derived from our curated benchmark dataset covering eight industry sectors.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.3 Sensitive Data</h3>
              <p>
                E-ARI is not designed to collect or process special categories of personal data as defined by the GDPR (racial or ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data, health data, or data concerning sex life or sexual orientation). If you inadvertently include such data in your assessment responses, please notify us immediately at dpo@e-ari.com so we can take appropriate measures. We recommend that you do not include personally identifiable information about specific individuals in your assessment responses.
              </p>
            </Section>

            {/* 5. Processor Obligations */}
            <Section id="obligations" icon={Shield} title="5. Processor Obligations">
              <p>
                E-ARI commits to the following obligations as Processor of your Personal Data:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Instruction-based processing:</span> We process Personal Data only on your documented instructions, as set out in the Terms of Service, this DPA, and any subsequent written instructions you provide through the platform's administrative features or by email to dpo@e-ari.com. We will not process Personal Data for any purpose incompatible with the purposes set out in this DPA.</li>
                <li><span className="text-foreground font-medium">Confidentiality:</span> All personnel authorized to process Personal Data have committed themselves to confidentiality obligations, either through employment contracts or specific NDAs. Access to Personal Data is restricted to personnel who need it to perform their duties.</li>
                <li><span className="text-foreground font-medium">Security measures:</span> We implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, as described in Section 7 of this DPA.</li>
                <li><span className="text-foreground font-medium">Sub-processor engagement:</span> We engage Sub-Processors only with prior authorization, as described in Section 6, and impose the same data protection obligations on them as are imposed on us under this DPA.</li>
                <li><span className="text-foreground font-medium">Data subject rights assistance:</span> We assist you in responding to requests from Data Subjects exercising their rights, as described in Section 9.</li>
                <li><span className="text-foreground font-medium">Deletion and return:</span> Upon termination of the Service, we will delete or return all Personal Data in accordance with Section 12, unless retention is required by applicable law.</li>
                <li><span className="text-foreground font-medium">Audit support:</span> We make available to you all information reasonably necessary to demonstrate compliance with this DPA and allow for and contribute to audits and inspections as described in Section 10.</li>
              </ul>
            </Section>

            {/* 6. Sub-Processors */}
            <Section id="subprocessors" icon={Server} title="6. Sub-Processors">
              <p>
                E-ARI engages the following categories of Sub-Processors to process Personal Data in the course of providing the Service. By accepting this DPA, you authorize the use of these Sub-Processors:
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.1 Current Sub-Processors</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-navy-700/30">
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Sub-Processor</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Purpose</th>
                      <th className="text-left p-3 font-heading font-semibold text-foreground">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/20">
                      <td className="p-3 text-foreground font-medium">OpenAI</td>
                      <td className="p-3">LLM processing for Insight, Discovery, Literacy, and Assistant agents</td>
                      <td className="p-3">United States</td>
                    </tr>
                    <tr className="border-t border-border/20">
                      <td className="p-3 text-foreground font-medium">Cloud Infrastructure Provider</td>
                      <td className="p-3">Application hosting, database storage, file storage, CDN</td>
                      <td className="p-3">United States / EU</td>
                    </tr>
                    <tr className="border-t border-border/20">
                      <td className="p-3 text-foreground font-medium">Payment Processor</td>
                      <td className="p-3">Billing and payment processing for Professional and Enterprise subscriptions</td>
                      <td className="p-3">United States</td>
                    </tr>
                    <tr className="border-t border-border/20">
                      <td className="p-3 text-foreground font-medium">Email Service Provider</td>
                      <td className="p-3">Transactional emails, assessment notifications, and support communications</td>
                      <td className="p-3">United States</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.2 Sub-Processor Changes</h3>
              <p>
                We will notify you of any addition or replacement of Sub-Processors by updating this page and sending an email notification to the address associated with your account at least 30 days before the change takes effect. You may object to a new Sub-Processor by notifying us at dpo@e-ari.com within 30 days of receiving the notification. If you object and we cannot provide an alternative, you may terminate the affected portion of the Service without penalty.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">6.3 LLM Processing Specifics</h3>
              <p>
                When assessment data is sent to OpenAI for processing by the Insight, Discovery, Literacy, and Assistant agents, the data is transmitted over encrypted connections (TLS 1.3) and processed under OpenAI's enterprise API agreement. Under this agreement, OpenAI does not use API data to train or improve their models. Prompts and completions are retained by OpenAI for a maximum of 30 days solely for abuse monitoring, after which they are permanently deleted. The Scoring Agent and Report Agent do not send data to OpenAI or any LLM provider.
              </p>
            </Section>

            {/* 7. Security Measures */}
            <Section id="security" icon={Lock} title="7. Security Measures">
              <p>
                E-ARI implements the following technical and organizational measures to protect Personal Data:
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">7.1 Technical Measures</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Encryption in transit:</span> All data transmitted between your browser and our servers, and between our services and Sub-Processors, is encrypted using TLS 1.3.</li>
                <li><span className="text-foreground font-medium">Encryption at rest:</span> All data stored in our databases and file storage systems is encrypted using AES-256. Database backups are encrypted and stored in geographically separate locations.</li>
                <li><span className="text-foreground font-medium">Key management:</span> Encryption keys are managed through a dedicated key management service with regular rotation schedules (at least every 90 days) and strict access controls.</li>
                <li><span className="text-foreground font-medium">Network security:</span> Our infrastructure is protected by firewalls, intrusion detection systems, and network segmentation. Direct database access from the public internet is not permitted.</li>
                <li><span className="text-foreground font-medium">Application security:</span> We perform regular vulnerability assessments, penetration testing, and security code reviews. Our development pipeline includes automated security scanning (SAST/DAST).</li>
                <li><span className="text-foreground font-medium">Password security:</span> User passwords are stored using bcrypt hashing with adaptive work factors. We never store passwords in plaintext or using reversible encryption.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">7.2 Organizational Measures</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Access control:</span> Role-based access control (RBAC) with the principle of least privilege. Production access requires multi-factor authentication and is logged for audit purposes.</li>
                <li><span className="text-foreground font-medium">Personnel training:</span> All personnel with access to Personal Data receive data protection training upon hire and annually thereafter. Training covers GDPR requirements, security best practices, and incident response procedures.</li>
                <li><span className="text-foreground font-medium">Data minimization:</span> We apply data minimization principles throughout the platform. Assessment data is only processed by the agents necessary for the requested output. LLM prompts include only the data required for the specific agent function.</li>
                <li><span className="text-foreground font-medium">Separation of concerns:</span> Development, staging, and production environments are strictly separated. Production data is never used in development or testing environments.</li>
                <li><span className="text-foreground font-medium">Vendor management:</span> All Sub-Processors are assessed for data protection compliance before engagement and reviewed annually. Sub-Processor agreements include data protection clauses equivalent to those in this DPA.</li>
              </ul>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">7.3 Enterprise Security</h3>
              <p>
                Enterprise customers may request additional security measures including: Single Sign-On (SSO) with SAML 2.0 integration, IP allowlisting, custom session timeout policies, and enhanced audit logging. These features are available on the Enterprise plan and can be configured by your organization's administrator.
              </p>
            </Section>

            {/* 8. Data Breach Notification */}
            <Section id="breach" icon={AlertCircle} title="8. Data Breach Notification">
              <p>
                In the event of a Personal Data breach (as defined by the GDPR), E-ARI will:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Notify the Controller without undue delay</span> and no later than 72 hours after becoming aware of the breach, unless the breach is unlikely to result in a risk to the rights and freedoms of Data Subjects.</li>
                <li><span className="text-foreground font-medium">Provide the following information:</span> The nature of the breach, including the categories and approximate number of Data Subjects and Personal Data records concerned; the likely consequences of the breach; and the measures taken or proposed to address the breach and mitigate its effects.</li>
                <li><span className="text-foreground font-medium">Cooperate with the Controller</span> in investigating the breach and taking remedial action, including assisting with any required notifications to supervisory authorities or Data Subjects.</li>
                <li><span className="text-foreground font-medium">Document all breaches,</span> including the facts of the breach, its effects, and the remedial action taken, and make this documentation available to supervisory authorities upon request.</li>
              </ul>
              <p>
                Notifications will be sent to the email address associated with your account and, for Enterprise customers, to the designated security contact specified in your Enterprise Agreement. We will also make reasonable efforts to notify affected Data Subjects directly if the breach is likely to result in a high risk to their rights and freedoms, unless prohibited by law.
              </p>
            </Section>

            {/* 9. Data Subject Rights Support */}
            <Section id="rights-support" icon={UserCheck} title="9. Data Subject Rights Support">
              <p>
                E-ARI assists you in fulfilling your obligations to respond to Data Subject requests to exercise their rights under Data Protection Laws. Specifically:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Access requests:</span> We provide tools in the platform dashboard for users to access and export their personal data, including assessment responses, scores, and AI-generated content. For bulk or complex access requests, contact dpo@e-ari.com.</li>
                <li><span className="text-foreground font-medium">Rectification requests:</span> Users can update their account information and retake assessments with corrected data directly from the platform. If rectification requires changes to previously generated AI outputs, the assessment can be reprocessed through the agent pipeline.</li>
                <li><span className="text-foreground font-medium">Erasure requests:</span> Users can request account deletion from their dashboard or by emailing dpo@e-ari.com. We will delete Personal Data within 30 days of receiving a valid erasure request, except where retention is required by law.</li>
                <li><span className="text-foreground font-medium">Portability requests:</span> Users can export their data in machine-readable formats (JSON, PDF) from the platform dashboard. This includes assessment responses, scores, and generated reports.</li>
                <li><span className="text-foreground font-medium">Objection and restriction:</span> Users can object to or request restriction of processing by contacting dpo@e-ari.com. We will cease the relevant processing unless we have compelling legitimate grounds that override the user's interests.</li>
              </ul>
              <p>
                If you receive a request from a Data Subject that requires our assistance, please forward the request to dpo@e-ari.com and we will respond within 15 business days. We will not respond directly to Data Subjects without your authorization, except where required by law.
              </p>
            </Section>

            {/* 10. Audits & Compliance */}
            <Section id="audits" icon={FileCheck} title="10. Audits & Compliance">
              <p>
                E-ARI makes available to you all information reasonably necessary to demonstrate our compliance with this DPA. We maintain the following certifications and compliance standards:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">SOC 2 Type II:</span> Our infrastructure providers maintain SOC 2 Type II certifications, and we are working toward our own SOC 2 Type II certification for the E-ARI platform.</li>
                <li><span className="text-foreground font-medium">ISO 27001:</span> Our cloud infrastructure providers are ISO 27001 certified. We follow ISO 27001 information security management practices internally.</li>
                <li><span className="text-foreground font-medium">GDPR compliance:</span> We comply with the GDPR as a Processor and have appointed a Data Protection Officer (DPO) who can be reached at dpo@e-ari.com.</li>
                <li><span className="text-foreground font-medium">Regular assessments:</span> We conduct annual security assessments and penetration testing by independent third parties. Summary reports are available to Enterprise customers upon request under NDA.</li>
              </ul>
              <p>
                Enterprise customers may conduct or commission audits of our data processing practices, subject to reasonable advance notice (at least 30 days) and execution of a mutually acceptable NDA. Audits must be conducted during normal business hours and in a manner that does not disrupt the Service or compromise the security of other customers' data. We will cooperate with any such audit and provide reasonable access to relevant facilities, systems, and records.
              </p>
            </Section>

            {/* 11. International Data Transfers */}
            <Section id="transfers" icon={Globe} title="11. International Data Transfers">
              <p>
                Personal Data may be transferred to and processed in countries other than the country in which it was originally collected. We ensure that all international transfers are subject to appropriate safeguards:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Standard Contractual Clauses (SCCs):</span> For transfers from the EEA, UK, or Switzerland to countries that do not have an adequacy decision, we rely on the European Commission's Standard Contractual Clauses (as approved and amended from time to time). These clauses are incorporated into our agreements with Sub-Processors by reference.</li>
                <li><span className="text-foreground font-medium">Adequacy decisions:</span> Where the European Commission has issued an adequacy decision for a specific country, transfers may proceed without additional safeguards.</li>
                <li><span className="text-foreground font-medium">Transfer Impact Assessments:</span> We conduct Transfer Impact Assessments for Sub-Processors located in countries without adequacy decisions, evaluating the legal framework of the destination country and the effectiveness of the safeguards in place.</li>
                <li><span className="text-foreground font-medium">OpenAI data residency:</span> OpenAI processes API data in the United States. We rely on Standard Contractual Clauses for this transfer and OpenAI's enterprise API data handling commitments, which include not using API data for model training and deleting data after 30 days.</li>
              </ul>
              <p>
                We will inform you of any changes to the transfer mechanisms we rely on and will obtain your consent before adopting alternative mechanisms where required by applicable law. For Enterprise customers with specific data residency requirements, we can discuss options for data processing within the EEA.
              </p>
            </Section>

            {/* 12. Data Retention & Deletion */}
            <Section id="retention-dpa" icon={Clock} title="12. Data Retention & Deletion">
              <p>
                E-ARI retains Personal Data for the duration of your account plus the periods specified below:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Active accounts:</span> All Personal Data is retained for as long as your account is active and you are using the Service. Assessment data remains accessible through your dashboard throughout the account lifetime.</li>
                <li><span className="text-foreground font-medium">Post-termination:</span> After account termination, Personal Data is retained for 90 days to allow for account reactivation and data export. After the 90-day period, all Personal Data is permanently deleted from our production systems within 30 additional days.</li>
                <li><span className="text-foreground font-medium">Backup systems:</span> Personal Data in backup systems is deleted within 180 days of account termination through our regular backup rotation cycle.</li>
                <li><span className="text-foreground font-medium">Legal holds:</span> Where retention is required by applicable law (e.g., financial records), Personal Data is retained for the legally mandated period and deleted promptly upon expiration.</li>
                <li><span className="text-foreground font-medium">Anonymized data:</span> Data that has been properly anonymized (such that re-identification is not reasonably possible) may be retained indefinitely for benchmarking and research purposes. Anonymized data is not subject to this DPA.</li>
              </ul>
              <p>
                You may request early deletion of your Personal Data at any time by contacting dpo@e-ari.com or using the account deletion feature in your dashboard. Upon confirmation, we will initiate deletion within 30 days and confirm completion via email.
              </p>
            </Section>

            {/* 13. Liability & Indemnification */}
            <Section id="liability" icon={Shield} title="13. Liability & Indemnification">
              <p>
                Each party's liability under this DPA is subject to the limitations and exclusions set out in the Terms of Service (Section 8). Nothing in this DPA limits either party's liability to the extent that such limitation would be unlawful under the GDPR or other applicable Data Protection Laws.
              </p>
              <p>
                E-ARI shall indemnify the Controller against claims, actions, third-party claims, losses, damages, and expenses incurred by the Controller arising out of or in connection with E-ARI's breach of this DPA or any applicable Data Protection Laws, provided that the Controller promptly notifies E-ARI in writing of the claim, gives E-ARI sole control of the defense and settlement, and provides reasonable cooperation.
              </p>
              <p>
                The Controller shall indemnify E-ARI against claims arising from: (a) the Controller's instructions to E-ARI that result in a violation of Data Protection Laws; (b) the Controller's failure to comply with its obligations as a Controller under Data Protection Laws; or (c) the content of the Personal Data provided by the Controller, including any unlawful or infringing content.
              </p>
            </Section>

            {/* 14. Contact & DPA Requests */}
            <Section id="dpa-contact" icon={AlertCircle} title="14. Contact & DPA Requests">
              <p>
                For questions about this DPA, to exercise Data Subject rights, or to request a signed copy of this agreement, please contact us:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><span className="text-foreground font-medium">Data Protection Officer:</span> dpo@e-ari.com</li>
                <li><span className="text-foreground font-medium">Privacy Team:</span> privacy@e-ari.com</li>
                <li><span className="text-foreground font-medium">Legal Team:</span> legal@e-ari.com</li>
                <li><span className="text-foreground font-medium">Security Team:</span> security@e-ari.com</li>
              </ul>
              <p>
                Enterprise customers who require a signed, customized DPA with specific data processing terms, data residency requirements, or additional security schedules should contact their account manager or email legal@e-ari.com. We will negotiate and execute a custom DPA within 30 days of receiving a written request.
              </p>
              <p>
                For EU/EEA residents: If you believe that our processing of your Personal Data violates the GDPR, you have the right to lodge a complaint with your local supervisory authority. We are committed to resolving any concerns and encourage you to contact us before filing a formal complaint.
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
                    Need a Custom DPA?
                  </h2>
                  <p className="text-muted-foreground font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                    Enterprise customers with specific compliance requirements can request a customized Data Processing Agreement. Our legal team will work with you to address your organization's data protection needs.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="mailto:legal@e-ari.com">
                      <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
                        Request Custom DPA
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </a>
                    <Link href="/privacy">
                      <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading min-h-[44px]">
                        Privacy Policy
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
