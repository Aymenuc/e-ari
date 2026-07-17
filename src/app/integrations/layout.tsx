import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations — connect E-ARI to your stack",
  description: "Connect single sign-on exports, expense data, and GRC tooling to E-ARI for shadow AI discovery and continuous compliance.",
  alternates: { canonical: "/integrations" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
