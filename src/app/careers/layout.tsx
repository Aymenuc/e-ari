import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — build the AI compliance layer for Europe",
  description: "Work on deterministic scoring, agentic pipelines, and EU AI Act tooling used by governance-heavy teams.",
  alternates: { canonical: "/careers" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
