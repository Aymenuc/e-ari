import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The E-ARI Handbook — methodology, pillars, and scoring",
  description: "The complete published methodology: eight pillars, deterministic scoring, six interdependency rules, eight X-Ray detectors, sector weighting, and the leverage simulation. Reproducible end to end.",
  alternates: { canonical: "/handbook" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
