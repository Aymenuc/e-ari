import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team — who builds E-ARI",
  description: "The team behind the Enterprise AI Readiness Index.",
  alternates: { canonical: "/team" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
