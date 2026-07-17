import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/shared/auth-provider";
import { NavigationLoader } from "@/components/shared/navigation-loader";
import { Suspense } from "react";
import { MotionConfig } from "framer-motion";
import Script from "next/script";
import { ConsentBanner } from "@/components/shared/consent-banner";
import { MaintenanceAdminBanner } from "@/components/shared/maintenance-admin-banner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.e-ari.com"),
  title: {
    default: "E-ARI — AI Readiness Assessment & EU AI Act Compliance Platform",
    template: "%s · E-ARI",
  },
  description:
    "Deterministic 8-pillar AI readiness scoring, an EU AI Act compliance autopilot, and six AI agents that turn your score into a defensible action plan. Built for governance-heavy teams.",
  keywords: [
    "AI readiness assessment",
    "EU AI Act compliance software",
    "AI governance platform",
    "AI Act Article 4 training",
    "AI maturity assessment",
    "shadow AI discovery",
    "AI compliance autopilot",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://www.e-ari.com",
    siteName: "E-ARI",
    title: "E-ARI — The AI readiness score you can defend",
    description:
      "Deterministic 8-pillar scoring, EU AI Act compliance autopilot, and six AI agents. Every number is reproducible arithmetic on a published methodology.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-ARI — The AI readiness score you can defend",
    description:
      "Deterministic AI readiness scoring and EU AI Act compliance for governance-heavy teams.",
  },
  icons: {
    icon: "/favicon.svg",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "6f332ee5e954d357",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ── Consent Mode v2 defaults (must run before GA loads) ─────────── */}
        <Script id="consent-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // Default: deny everything until the user consents
            gtag('consent', 'default', {
              analytics_storage:  'denied',
              ad_storage:         'denied',
              ad_user_data:       'denied',
              ad_personalization: 'denied',
              wait_for_update:    500,
            });

            // If the user already accepted in a previous visit, upgrade immediately
            try {
              var stored = localStorage.getItem('ea_consent');
              if (stored === 'granted') {
                gtag('consent', 'update', {
                  analytics_storage:  'granted',
                  ad_storage:         'granted',
                  ad_user_data:       'granted',
                  ad_personalization: 'granted',
                });
              }
            } catch(e) {}
          `}
        </Script>

        {/* ── Google Analytics ─────────────────────────────────────────────── */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9DHWN4XT6E"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9DHWN4XT6E');
          `}
        </Script>
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <Suspense>
              <NavigationLoader />
            </Suspense>
            <MaintenanceAdminBanner />
            {children}
            <Toaster />
            <ConsentBanner />
          </MotionConfig>
        </AuthProvider>
      </body>
    </html>
  );
}
