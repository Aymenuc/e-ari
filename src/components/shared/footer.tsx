import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { BrandWordmark } from "@/components/shared/brand-wordmark";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand + emails */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="E-ARI" className="h-8 w-8 rounded-lg" />
              <BrandWordmark size="sm" />
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              Enterprise AI Readiness Assessment. Evidence-based, actionable outputs for organizations advancing their AI journey.
            </p>
            <div className="space-y-1.5">
              <a href="mailto:support@e-ari.com" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">
                <Mail className="h-3 w-3 shrink-0 text-eari-blue/70" />
                support@e-ari.com
              </a>
              <a href="mailto:hello@e-ari.com" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">
                <MessageSquare className="h-3 w-3 shrink-0 text-eari-blue/70" />
                hello@e-ari.com
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/#methodology" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Methodology</Link></li>
              <li><Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Pricing</Link></li>
              <li><Link href="/assessment" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Start Assessment</Link></li>
              <li><Link href="/discovery" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Discovery Agent</Link></li>
              <li><Link href="/literacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">AI Literacy</Link></li>
              <li><Link href="/handbook" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Handbook</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/team" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Team</Link></li>
              <li><span className="text-xs text-muted-foreground font-sans">About</span></li>
              <li><Link href="/careers" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Careers</Link></li>
              <li><Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Privacy</Link></li>
              <li><Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Terms</Link></li>
              <li><Link href="/data-processing" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-sans">Data Processing</Link></li>
            </ul>
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
