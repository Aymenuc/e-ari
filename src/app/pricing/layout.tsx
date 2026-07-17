import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free assessment to Compliance Autopilot",
  description: "Start free with a full 8-pillar AI readiness assessment. Upgrade for AI narratives, sector benchmarks, the compliance workspace, and the EU AI Act autopilot. Transparent pricing, no hidden fees.",
  alternates: { canonical: "/pricing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
