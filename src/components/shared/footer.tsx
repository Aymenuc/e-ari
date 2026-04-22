import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/logo.svg"
                alt="E-ARI"
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-heading font-semibold text-foreground">E-ARI</span>
            </div>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Enterprise AI Readiness Assessment. Evidence-based, actionable outputs for organizations starting or advancing their AI journey.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/#methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Methodology</Link></li>
              <li><Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Pricing</Link></li>
              <li><Link href="/assessment" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Start Assessment</Link></li>
              <li><Link href="/discovery" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Discovery Agent</Link></li>
              <li><Link href="/literacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">AI Literacy</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/team" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Team</Link></li>
              <li><span className="text-sm text-muted-foreground font-sans">About</span></li>
              <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Terms of Service</Link></li>
              <li><Link href="/data-processing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-sans">Data Processing</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
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
