import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer API — readiness data in your GRC stack",
  description: "REST API for assessments, AI systems, controls, and vendors. Read and write E-ARI data from your own tooling with scoped API keys.",
  alternates: { canonical: "/developers" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
