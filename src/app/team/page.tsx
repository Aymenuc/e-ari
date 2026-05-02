'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Linkedin,
  Twitter,
  Mail,
  ArrowRight,
  Sparkles,
  Target,
  Shield,
  Globe,
  Users,
  Lightbulb,
  Rocket,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/shared/navigation'
import { Footer } from '@/components/shared/footer'

/* ─── Animation helpers ────────────────────────────────────────────────── */

function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Team data ─────────────────────────────────────────────────────────── */

const FOUNDER = {
  name: 'Dr. Aymen Boudebouz',
  title: 'Founder & CEO',
  bio: 'Dr. Aymen Boudebouz is the visionary behind E-ARI, driven by a conviction that enterprise AI readiness must be measured with the same rigor we apply to financial audits and cybersecurity assessments. A seasoned researcher with a Ph.D. in Spatial Planning and Urban Governance from the Universities of Porto and Coimbra, Dr. Boudebouz brings years of experience in digital governance, policy-driven innovation, and evaluating deliberative processes in both public and private sectors. His research on community development, e-participation, and the intersection of technology and governance has been published in leading academic venues and presented at international conferences. Recognizing a critical gap — that organizations were investing billions in AI without a standardized, evidence-based method to assess their actual readiness — he founded E-ARI to close it. The platform provides Fortune 500 companies and government agencies with a deterministic, transparent, and board-ready assessment methodology that leaves no room for guesswork. His approach rejects vanity metrics and AI hype in favor of reproducible scoring, clear maturity classifications, and actionable strategic insights that executives can trust when making multi-million dollar AI investment decisions.',
  highlights: [
    'Holds a Ph.D. in Spatial Planning and Urban Governance, with extensive research on digital governance and social innovation',
    'Architected the 8-Pillar AI Readiness Framework used across enterprise and government sectors',
    'Published research on e-participation, community development, and technology-enabled governance at international conferences',
    'Championed deterministic scoring methodology — no randomness, no hidden variables, fully auditable',
    'Advocates for AI governance as a first-class pillar, not an afterthought in enterprise transformation',
  ],
  social: {
    linkedin: 'https://pt.linkedin.com/in/aymen-boudebouz',
    twitter: '#',
    email: 'aymen@e-ari.com',
  },
}

const LEADERSHIP = [
  {
    name: 'Sarah Chen',
    title: 'Head of Assessment Methodology',
    bio: 'Former enterprise architect at a Big Four consultancy, Sarah designed the scoring pipeline that makes E-ARI deterministic and reproducible. She ensures every assessment question, weight, and adjustment rule is grounded in validated research and industry benchmarks.',
    icon: Target,
  },
  {
    name: 'Marcus Okonkwo',
    title: 'Head of AI & Insights',
    bio: 'With a background in NLP research and responsible AI deployment, Marcus leads the AI insights engine that generates strategic narratives from assessment data. His team ensures AI-generated content is clearly labeled, grounded in scores, and never alters calculated results.',
    icon: Sparkles,
  },
  {
    name: 'Dr. Elena Vasquez',
    title: 'Head of Governance & Ethics',
    bio: 'A former policy advisor on AI regulation, Elena ensures E-ARI\'s governance and ethics pillars reflect the latest regulatory requirements. She oversees the privacy-first architecture and ensures all data handling meets enterprise-grade compliance standards.',
    icon: Shield,
  },
  {
    name: 'James Nakamura',
    title: 'Head of Product Engineering',
    bio: 'James leads the engineering team building E-ARI\'s platform, from the assessment wizard to the results dashboard and PDF reporting. He brings a decade of experience shipping enterprise SaaS products with a focus on reliability, accessibility, and performance.',
    icon: Rocket,
  },
]

const VALUES = [
  {
    icon: Target,
    title: 'Evidence Over Intuition',
    desc: 'Every score is calculated. Every insight is grounded. No gut feelings, no vanity metrics, no inflated results. We believe decisions about AI investment deserve the same rigor as financial audits.',
  },
  {
    icon: Shield,
    title: 'Transparency by Default',
    desc: 'Our scoring methodology is fully documented, versioned, and auditable. If AI generates a narrative, it is clearly labeled. We never hide what is calculated versus what is generated.',
  },
  {
    icon: Globe,
    title: 'Enterprise & Government Grade',
    desc: 'Built for the organizations where getting AI readiness wrong carries real consequences — regulatory penalties, wasted investment, reputational damage. We hold ourselves to the standards our clients demand.',
  },
  {
    icon: Users,
    title: 'People-Centered Transformation',
    desc: 'Technology readiness means nothing without talent, culture, and process readiness. Our 8-pillar framework ensures the human dimensions of AI adoption are never treated as afterthoughts.',
  },
  {
    icon: Lightbulb,
    title: 'Actionable Over Abstract',
    desc: 'Assessments that produce scores without next steps are entertainment. Every E-ARI output includes prioritized, context-aware recommendations that decision-makers can act on immediately.',
  },
  {
    icon: Sparkles,
    title: 'AI That Serves, Not Overrides',
    desc: 'We use AI to enhance human judgment — never to replace it. Our AI insights are supplementary narratives, not decision-makers. The scores are always deterministic; the AI just helps tell the story.',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TEAM PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function TeamPage() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        {/* ─── HERO ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
          {/* Mesh background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              className="mesh-blob absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
            />
            <div
              className="mesh-blob absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animationDelay: '-7s' }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto">
                <Badge variant="outline" className="mb-6 font-mono text-xs border-eari-blue/40 text-eari-blue-light">
                  The People Behind E-ARI
                </Badge>
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                  Building the Standard for{' '}
                  <span className="text-eari-blue-light">AI Readiness</span>
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
                  We are a team of strategists, engineers, and researchers united by one conviction: organizations deserve a rigorous, transparent way to measure their AI readiness — not guesswork.
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ─── FOUNDER SECTION ──────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <Badge variant="outline" className="font-mono text-xs border-eari-blue/40 text-eari-blue-light mb-4">
                  Leadership
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                  Meet the Founder
                </h2>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
              {/* Founder card */}
              <FadeUp className="lg:col-span-2">
                <Card className="bg-navy-800 border-border/50 overflow-hidden">
                  {/* Avatar placeholder with gradient */}
                  <div className="relative h-64 bg-navy-800/90 border-b border-white/[0.06] flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-eari-blue flex items-center justify-center shadow-lg shadow-eari-blue/25">
                      <span className="font-heading text-4xl font-bold text-white">AB</span>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-eari-blue/20 text-eari-blue-light border-eari-blue/30 text-xs font-mono">
                        Founder
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-heading text-2xl font-bold text-foreground">{FOUNDER.name}</h3>
                    <p className="font-heading text-sm font-medium text-eari-blue-light mt-1">{FOUNDER.title}</p>

                    {/* Social links */}
                    <div className="flex items-center gap-3 mt-4">
                      <a href={FOUNDER.social.linkedin} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors" aria-label="LinkedIn">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <a href={FOUNDER.social.twitter} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors" aria-label="Twitter">
                        <Twitter className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <a href={`mailto:${FOUNDER.social.email}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors" aria-label="Email">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </FadeUp>

              {/* Founder bio + highlights */}
              <FadeUp delay={0.1} className="lg:col-span-3 space-y-6">
                <div>
                  <p className="text-foreground font-sans leading-relaxed text-base">
                    {FOUNDER.bio}
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-3">
                  <h4 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Key Contributions
                  </h4>
                  {FOUNDER.highlights.map((highlight, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-eari-blue/15 flex-shrink-0 mt-0.5">
                        <span className="text-eari-blue-light font-heading text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground font-sans leading-relaxed">{highlight}</p>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <div className="relative mt-8 p-6 rounded-xl bg-navy-800 border border-eari-blue/20">
                  <Quote className="absolute top-4 left-4 h-8 w-8 text-eari-blue/20" />
                  <blockquote className="font-heading text-lg text-foreground font-medium italic leading-relaxed pl-8">
                    &ldquo;If you can&rsquo;t measure your AI readiness with the same rigor you measure financial risk, you&rsquo;re not ready — you&rsquo;re hoping. E-ARI exists to replace hope with evidence.&rdquo;
                  </blockquote>
                  <p className="mt-3 text-sm text-muted-foreground font-sans pl-8">— Dr. Aymen Boudebouz</p>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ─── LEADERSHIP TEAM ──────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 bg-navy-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                  Leadership Team
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  Domain experts across AI strategy, governance, engineering, and methodology — working together to ensure every assessment meets the highest standards.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {LEADERSHIP.map((person, i) => {
                const Icon = person.icon
                return (
                  <FadeUp key={person.name} delay={i * 0.08}>
                    <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eari-blue/12 border border-eari-blue/20 flex-shrink-0">
                            <Icon className="h-6 w-6 text-eari-blue-light" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-semibold text-foreground text-base">{person.name}</h3>
                            <p className="font-heading text-sm text-eari-blue-light mt-0.5">{person.title}</p>
                            <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed">{person.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeUp>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── VALUES ───────────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 bg-navy-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                  What We Stand For
                </h2>
                <p className="mt-4 text-lg text-muted-foreground font-sans">
                  The principles that shape every feature, every score, and every insight on this platform.
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {VALUES.map((value, i) => {
                const Icon = value.icon
                return (
                  <FadeUp key={value.title} delay={i * 0.06}>
                    <Card className="bg-navy-800 border-border/50 hover:border-eari-blue/30 transition-colors duration-300 h-full">
                      <CardContent className="p-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-eari-blue/15 mb-4">
                          <Icon className="h-5 w-5 text-eari-blue-light" />
                        </div>
                        <h3 className="font-heading font-semibold text-foreground text-base mb-2">{value.title}</h3>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">{value.desc}</p>
                      </CardContent>
                    </Card>
                  </FadeUp>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── JOIN US CTA ──────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 bg-navy-900">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeUp>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                Interested in Joining the Team?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-sans max-w-2xl mx-auto">
                We are always looking for exceptional people who share our conviction that AI readiness deserves the same rigor as financial auditing. If that resonates, we would love to hear from you.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-eari-blue hover:bg-eari-blue-dark text-white font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto">
                    Start Free Assessment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="mailto:careers@e-ari.com">
                  <Button variant="outline" size="lg" className="border-border hover:bg-navy-700 text-foreground font-heading font-semibold h-12 px-8 text-base w-full sm:w-auto">
                    <Mail className="mr-2 h-4 w-4" />
                    Careers at E-ARI
                  </Button>
                </a>
              </div>
            </FadeUp>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
