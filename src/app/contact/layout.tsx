import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — talk to E-ARI",
  description: "Questions about assessments, the EU AI Act autopilot, or enterprise deployment — reach the E-ARI team.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
