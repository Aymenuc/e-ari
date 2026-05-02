'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FileText,
  Scale,
  CreditCard,
  Shield,
  AlertTriangle,
  Ban,
  Gavel,
  RefreshCw,
  Globe,
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
   TERMS OF SERVICE PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function TermsOfServicePage() {
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
                Terms of Service
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
                The agreement governing your use of the E-ARI platform. Please read these terms carefully before creating an account or conducting an assessment.
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
                      { id: 'acceptance', label: '1. Acceptance of Terms' },
                      { id: 'description', label: '2. Description of Service' },
                      { id: 'accounts', label: '3. Accounts & Registration' },
                      { id: 'subscription', label: '4. Subscription Plans & Billing' },
                      { id: 'assessments', label: '5. Assessments & AI Outputs' },
                      { id: 'ip', label: '6. Intellectual Property' },
                      { id: 'acceptable', label: '7. Acceptable Use' },
                      { id: 'disclaimers', label: '8. Disclaimers & Limitations' },
                      { id: 'indemnification', label: '9. Indemnification' },
                      { id: 'termination', label: '10. Termination' },
                      { id: 'modifications', label: '11. Modifications to Service' },
                      { id: 'governing', label: '12. Governing Law & Disputes' },
                      { id: 'misc', label: '13. Miscellaneous' },
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

            {/* 1. Acceptance of Terms */}
            <Section id="acceptance" icon={Scale} title="1. Acceptance of Terms">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and E-ARI ("Company," "we," "us," or "our") governing your access to and use of the E-ARI platform, including the website at e-ari.com, all subdomains, APIs, mobile applications, and related services (collectively, the "Service"). By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
              </p>
              <p>
                If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms. If you do not agree with any part of these Terms, you must not use the Service. These Terms are in addition to our Privacy Policy and Data Processing Agreement, which also apply to your use of the Service.
              </p>
            </Section>

            {/* 2. Description of Service */}
            <Section id="description" icon={FileText} title="2. Description of Service">
              <p>
                E-ARI is an enterprise AI readiness assessment platform that enables organizations to measure, analyze, and improve their preparedness for AI adoption. The Service provides structured assessments across eight pillars (Strategy & Vision, Data & Infrastructure, Talent & Culture, Governance & Ethics, Technology & Tools, Process & Operations, Customer & Market, and Innovation & Agility), processed through a pipeline of six specialized AI agents.
              </p>
              <p>
                The six agents operate as follows: (1) The Scoring Agent calculates deterministic pillar scores and maturity classifications using a fixed, auditable methodology (Methodology v5.3); (2) The Insight Agent generates strategic narratives and cross-pillar analysis using large language models; (3) The Discovery Agent maps your organization's AI landscape, identifies gaps, and assesses competitive positioning; (4) The Report Agent compiles assessment results into PDF reports with executive summaries, benchmarks, roadmaps, and recommendations; (5) The Literacy Agent evaluates AI literacy across your organization and recommends learning paths; (6) The Assistant Agent provides interactive Q&A about your assessment results.
              </p>
              <p>
                The availability of specific agents and features depends on your subscription tier. Starter accounts have access to the Scoring Agent and limited Insight Agent outputs. Professional accounts have access to all six agents. Enterprise accounts receive additional features including multi-organization management, API access, and custom branding.
              </p>
            </Section>

            {/* 3. Accounts & Registration */}
            <Section id="accounts" icon={Shield} title="3. Accounts & Registration">
              <p>
                To use the Service, you must create an account by providing your full name, email address, organization name, job title, and industry sector. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account by contacting security@e-ari.com.
              </p>
              <p>
                You agree to provide accurate, current, and complete information during registration and to update such information as necessary to keep it accurate, current, and complete. We reserve the right to suspend or terminate accounts that contain false or misleading information. Each individual may maintain only one account; organizations on the Enterprise plan may provision multiple user accounts through their administrative dashboard.
              </p>
              <p>
                You must be at least 18 years old to create an account. By creating an account, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. Accounts created by automated means, bots, or scripts are strictly prohibited and will be terminated immediately.
              </p>
            </Section>

            {/* 4. Subscription Plans & Billing */}
            <Section id="subscription" icon={CreditCard} title="4. Subscription Plans & Billing">
              <p>
                E-ARI offers three subscription tiers: Starter (free), Professional ($29 per month), and Enterprise (custom pricing). The features available under each tier are described on our pricing page and in these Terms. We reserve the right to modify pricing with 30 days' advance notice.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.1 Billing and Payments</h3>
              <p>
                Professional subscriptions are billed in advance on a monthly or annual basis, depending on the billing cycle you selected at signup. Payment is processed through our PCI-compliant payment provider. You authorize us to charge the applicable fees to the payment method you provided. If a payment fails, we will attempt to process it again and may suspend access to paid features until the payment is successfully completed.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.2 Cancellation</h3>
              <p>
                You may cancel your Professional subscription at any time from your account settings or by contacting support@e-ari.com. Upon cancellation, your account will revert to the Starter plan at the end of your current billing period. You will retain access to Professional features until the end of the paid period. No partial refunds are provided for unused portions of a billing period. Annual subscribers who cancel within the first 24 hours may request a prorated refund by contacting support.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.3 Enterprise Agreements</h3>
              <p>
                Enterprise subscriptions are governed by a separate Enterprise Agreement that supersedes the billing provisions of these Terms to the extent of any conflict. Enterprise pricing, payment terms, and service levels are negotiated individually and documented in the signed agreement.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">4.4 Price Changes</h3>
              <p>
                We may adjust pricing for any tier with 30 days' advance notice communicated via email to the address associated with your account. If you do not agree with a price change, you may cancel your subscription before the change takes effect. Continued use of the Service after the effective date of a price change constitutes acceptance of the new pricing.
              </p>
            </Section>

            {/* 5. Assessments & AI Outputs */}
            <Section id="assessments" icon={FileText} title="5. Assessments & AI Outputs">
              <p>
                When you complete an assessment, your responses are processed through the 6-agent pipeline to generate scores, insights, reports, and recommendations. It is important that you understand the nature and limitations of these outputs.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">5.1 Deterministic Scoring</h3>
              <p>
                The Scoring Agent produces pillar scores using a deterministic, rule-based methodology (Methodology v5.3). Given the same inputs, the scoring algorithm will always produce the same outputs. Scoring is fully auditable: the methodology, question weights, adjustment rules, and maturity band thresholds are documented and versioned. We do not use randomness, machine learning inference, or hidden variables in the scoring process.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">5.2 AI-Generated Content</h3>
              <p>
                Content produced by the Insight, Discovery, Literacy, and Assistant agents is generated by large language models and is supplementary to the deterministic scores. AI-generated narratives, recommendations, and analyses are clearly labeled as such within the platform. While we engineer our prompts and validation processes to maximize accuracy and relevance, AI-generated content may occasionally contain inaccuracies, omissions, or inconsistencies. You should not rely solely on AI-generated content for making critical business decisions without independent verification.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">5.3 Assessment Accuracy</h3>
              <p>
                The quality and accuracy of assessment outputs depend directly on the quality and honesty of your responses. Incomplete, inaccurate, or misleading answers will produce scores and insights that do not reflect your organization's true readiness. You are responsible for providing truthful and complete responses. We do not guarantee that assessment results will identify all risks or opportunities relevant to your organization.
              </p>

              <h3 className="font-heading font-semibold text-foreground text-base pt-2">5.4 Ownership of Outputs</h3>
              <p>
                You own the assessment responses you provide. You own the right to use the assessment outputs (scores, insights, reports, recommendations) generated from your responses for your organization's internal purposes. E-ARI retains the right to use anonymized, aggregated assessment data for benchmarking, methodology improvement, and academic research. We will never attribute specific assessment results to a named organization without explicit written consent.
              </p>
            </Section>

            {/* 6. Intellectual Property */}
            <Section id="ip" icon={Gavel} title="6. Intellectual Property">
              <p>
                The E-ARI platform, including its methodology, scoring algorithms, question designs, agent architectures, user interface, visual design, branding, documentation, and software code, is the proprietary property of E-ARI and is protected by copyright, trademark, patent, and other intellectual property laws. The E-ARI name, logo, and product names are trademarks of E-ARI.
              </p>
              <p>
                You are granted a limited, non-exclusive, non-transferable, revocable license to use the Service for its intended purpose during the term of your subscription. You may not: (a) reverse engineer, decompile, or disassemble any part of the Service; (b) copy, modify, or distribute the methodology, scoring rules, or agent prompt architectures; (c) use the Service to build a competing product or service; (d) remove, alter, or obscure any proprietary notices on the Service; or (e) use the E-ARI name, logo, or trademarks without prior written consent.
              </p>
              <p>
                Enterprise customers who license the white-label option may use the Service under their own branding as specified in their Enterprise Agreement, but the underlying intellectual property remains the exclusive property of E-ARI.
              </p>
            </Section>

            {/* 7. Acceptable Use */}
            <Section id="acceptable" icon={Ban} title="7. Acceptable Use">
              <p>
                You agree not to use the Service in any way that violates applicable laws, regulations, or third-party rights. The following activities are expressly prohibited:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li>Using the Service to conduct assessments on behalf of organizations without their knowledge or authorization</li>
                <li>Providing false, misleading, or fraudulent information in assessment responses</li>
                <li>Attempting to manipulate assessment scores by reverse-engineering the scoring methodology or gaming the questionnaire</li>
                <li>Sharing your account credentials with unauthorized individuals or allowing others to access the Service through your account</li>
                <li>Using automated tools, bots, or scripts to access the Service, scrape data, or perform actions at scale without authorization</li>
                <li>Attempting to gain unauthorized access to other users' accounts, assessment data, or platform infrastructure</li>
                <li>Using the Service to generate content that is defamatory, discriminatory, harassing, or otherwise harmful</li>
                <li>Interfering with or disrupting the integrity, performance, or availability of the Service or its infrastructure</li>
                <li>Exporting assessment data in violation of export control laws or sanctions regulations</li>
                <li>Using the Service in any manner that could damage, disable, overburden, or impair our servers or networks</li>
              </ul>
              <p>
                We reserve the right to investigate and take appropriate action against anyone who, in our sole discretion, violates this provision, including removing content, suspending or terminating accounts, and reporting violations to law enforcement authorities.
              </p>
            </Section>

            {/* 8. Disclaimers & Limitations */}
            <Section id="disclaimers" icon={AlertTriangle} title="8. Disclaimers & Limitations of Liability">
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
              </p>
              <p>
                ASSESSMENT RESULTS, AI-GENERATED INSIGHTS, AND RECOMMENDATIONS ARE PROVIDED FOR INFORMATIONAL AND STRATEGIC PLANNING PURPOSES ONLY. THEY DO NOT CONSTITUTE LEGAL, FINANCIAL, REGULATORY, OR PROFESSIONAL ADVICE. YOU SHOULD CONSULT QUALIFIED PROFESSIONALS BEFORE MAKING BUSINESS DECISIONS BASED ON ASSESSMENT OUTPUTS. E-ARI IS NOT LIABLE FOR ANY DECISIONS MADE OR ACTIONS TAKEN BASED ON THE CONTENT PROVIDED BY THE SERVICE.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL E-ARI BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE TOTAL FEES YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
              </p>
              <p>
                Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential or incidental damages, so some of the above limitations may not apply to you. In such cases, our liability will be limited to the maximum extent permitted by applicable law.
              </p>
            </Section>

            {/* 9. Indemnification */}
            <Section id="indemnification" icon={Shield} title="9. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless E-ARI and its officers, directors, employees, agents, licensors, and service providers from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of applicable laws or regulations; (d) your violation of any third-party right, including intellectual property rights; or (e) any content or information you provide to the Service.
              </p>
              <p>
                We reserve the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, and in such case, you agree to cooperate with our defense of such claim. The indemnification obligations under this section will survive termination of these Terms and your use of the Service.
              </p>
            </Section>

            {/* 10. Termination */}
            <Section id="termination" icon={RefreshCw} title="10. Termination">
              <p>
                You may terminate your account at any time by contacting support@e-ari.com or through your account settings. Upon termination, your right to use the Service will immediately cease. We will delete your personal information in accordance with our data retention policy (see our Privacy Policy, Section 7).
              </p>
              <p>
                We may suspend or terminate your account and access to the Service, without prior notice or liability, for any reason, including but not limited to: (a) breach of these Terms; (b) conduct that we determine, in our sole discretion, is harmful to other users, the Service, or our business interests; (c) prolonged inactivity (no login for 12 consecutive months on free accounts); or (d) as required by law or legal process.
              </p>
              <p>
                Upon termination for cause (your breach of Terms), no refund will be provided for any prepaid subscription fees. Upon termination without cause, we will provide a prorated refund for any unused portion of your current billing period. Provisions of these Terms that by their nature should survive termination shall remain in effect, including but not limited to Sections 6 (Intellectual Property), 8 (Disclaimers & Limitations), 9 (Indemnification), and 12 (Governing Law).
              </p>
            </Section>

            {/* 11. Modifications to Service */}
            <Section id="modifications" icon={RefreshCw} title="11. Modifications to Service">
              <p>
                We reserve the right to modify, update, or discontinue any aspect of the Service at any time, including but not limited to assessment questions, scoring methodology, agent capabilities, feature availability, and pricing. When we make material changes to the Service that affect existing users, we will provide reasonable notice through the platform or by email.
              </p>
              <p>
                Our scoring methodology is versioned (currently v5.3), and we document all changes to the methodology in our changelog. When methodology updates affect how scores are calculated, we may recalculate historical assessments using the new methodology to maintain consistency, and we will notify you of such recalculations. You will always be able to see which methodology version was used for any given assessment.
              </p>
            </Section>

            {/* 12. Governing Law & Disputes */}
            <Section id="governing" icon={Globe} title="12. Governing Law & Disputes">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which E-ARI is incorporated, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Service shall be resolved first through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration administered by a mutually agreed arbitration institution, except where prohibited by law.
              </p>
              <p>
                You agree that any arbitration or court proceedings shall be conducted on an individual basis, not as part of a class action, collective action, or representative action. You waive any right to participate in a class action lawsuit or class-wide arbitration against E-ARI. This arbitration agreement does not prevent you from bringing claims in small claims court, if your claims qualify and you comply with the court's requirements.
              </p>
              <p>
                Any claim or cause of action arising out of or related to your use of the Service or these Terms must be filed within one (1) year after such claim or cause of action arose, or it shall be forever barred.
              </p>
            </Section>

            {/* 13. Miscellaneous */}
            <Section id="misc" icon={FileText} title="13. Miscellaneous">
              <p>
                <span className="text-foreground font-medium">Entire Agreement:</span> These Terms, together with our Privacy Policy and Data Processing Agreement, constitute the entire agreement between you and E-ARI regarding the Service, and supersede any prior agreements or understandings.
              </p>
              <p>
                <span className="text-foreground font-medium">Severability:</span> If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect, and the invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
              </p>
              <p>
                <span className="text-foreground font-medium">Waiver:</span> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver of any provision of these Terms will be effective only if in writing and signed by E-ARI.
              </p>
              <p>
                <span className="text-foreground font-medium">Assignment:</span> You may not assign or transfer these Terms or your rights under these Terms, in whole or in part, without our prior written consent. We may assign our rights and obligations under these Terms without restriction.
              </p>
              <p>
                <span className="text-foreground font-medium">Force Majeure:</span> We shall not be liable for any failure or delay in performing our obligations under these Terms due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, shortages of labor or materials, or Internet service provider failures.
              </p>
              <p>
                <span className="text-foreground font-medium">Contact:</span> For questions about these Terms, please contact us at legal@e-ari.com.
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
                    Questions About These Terms?
                  </h2>
                  <p className="text-muted-foreground font-sans max-w-xl mx-auto mb-8 leading-relaxed">
                    If any part of these Terms is unclear or you need clarification, our legal team is available to help. We believe in making our agreements as transparent as our methodology.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="mailto:legal@e-ari.com">
                      <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold shadow-md shadow-eari-blue/15 min-h-[44px]">
                        Contact Legal Team
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
