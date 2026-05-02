import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { ContactForm } from "@/components/shared/contact-form";
import { Mail, MessageSquare, Clock, Shield } from "lucide-react";

const INFO = [
  { icon: Clock, label: "Response time", value: "Within 24 hours on business days" },
  { icon: Mail, label: "Support", value: "support@e-ari.com" },
  { icon: MessageSquare, label: "General", value: "hello@e-ari.com" },
  { icon: Shield, label: "Enterprise & partnerships", value: "Mention it in your message" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-navy-900 to-background py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-eari-blue/8 blur-3xl" />
            <div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-cyan-500/6 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-eari-blue/25 bg-eari-blue/10 px-3 py-1 text-xs font-mono text-eari-blue-light">
              <span className="h-1.5 w-1.5 rounded-full bg-eari-blue opacity-90" />
              We respond within 24 hours
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground font-sans leading-relaxed max-w-xl mx-auto">
              Questions about AI readiness, enterprise pricing, or methodology? We&apos;re happy to help.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Left: info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="font-heading font-semibold text-xl text-foreground mb-3">How can we help?</h2>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                  Whether you&apos;re evaluating E-ARI for your organization, have questions about assessment methodology, or need enterprise onboarding support — fill out the form and the right person will get back to you.
                </p>
              </div>

              <div className="space-y-4">
                {INFO.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-eari-blue/10 border border-eari-blue/20">
                      <Icon className="h-4 w-4 text-eari-blue-light" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="font-sans text-sm text-foreground mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/40 bg-navy-800/40 p-5">
                <p className="font-heading font-semibold text-sm text-foreground mb-2">Enterprise clients</p>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  For Fortune 500 and government accounts, mention your organization size and use case. We offer dedicated onboarding, custom sector benchmarks, and SLA-backed support.
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border/50 bg-navy-800/60 p-8 backdrop-blur-sm shadow-xl shadow-black/10">
                <h3 className="font-heading font-semibold text-lg text-foreground mb-1">Send us a message</h3>
                <p className="text-sm text-muted-foreground font-sans mb-6">All fields are required unless marked optional.</p>
                <ContactForm />
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
