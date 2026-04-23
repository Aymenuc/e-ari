import Link from "next/link";
import { Mail, MessageSquare, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* Brand + info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="E-ARI" className="h-9 w-9 rounded-lg" />
              <span className="font-heading font-semibold text-lg text-foreground">E-ARI</span>
            </div>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed max-w-sm">
              Enterprise AI Readiness Assessment. Evidence-based, actionable outputs for organizations starting or advancing their AI journey.
            </p>
            <div className="space-y-2">
              <a href="mailto:support@e-ari.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">
                <Mail className="h-3.5 w-3.5 shrink-0 text-eari-blue/70" />
                support@e-ari.com
              </a>
              <a href="mailto:hello@e-ari.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-eari-blue/70" />
                hello@e-ari.com
              </a>
            </div>

            {/* Link columns side-by-side */}
            <div className="grid grid-cols-3 gap-6 pt-2">
              <div>
                <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Product</h3>
                <ul className="space-y-2">
                  <li><Link href="/#methodology" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Methodology</Link></li>
                  <li><Link href="/#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Pricing</Link></li>
                  <li><Link href="/assessment" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Start Assessment</Link></li>
                  <li><Link href="/discovery" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Discovery Agent</Link></li>
                  <li><Link href="/literacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">AI Literacy</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Company</h3>
                <ul className="space-y-2">
                  <li><Link href="/team" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Team</Link></li>
                  <li><span className="text-xs text-muted-foreground font-sans">About</span></li>
                  <li><Link href="/careers" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Careers</Link></li>
                  <li><Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Privacy</Link></li>
                  <li><Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Terms</Link></li>
                  <li><Link href="/data-processing" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Data Processing</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Get in Touch CTA */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-eari-blue/20 bg-navy-800/60 p-6 backdrop-blur-sm h-full flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10 border border-eari-blue/20 mb-4">
                  <Mail className="h-5 w-5 text-eari-blue-light" />
                </div>
                <h3 className="font-heading font-semibold text-base text-foreground mb-2">Get in Touch</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Questions about AI readiness, enterprise pricing, or methodology? Our team responds within 24 hours.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Link
                  href="/contact"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-eari-blue px-4 py-2.5 text-sm font-sans font-medium text-white hover:bg-eari-blue-dark transition-colors"
                >
                  Send us a message
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-[11px] font-mono text-muted-foreground">
                  We respond within 24 business hours
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground font-sans">
            &copy; {new Date().getFullYear()} E-ARI Platform. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Scoring v5.3 &middot; Methodology v5.3
          </p>
        </div>
      </div>
    </footer>
  );
}
