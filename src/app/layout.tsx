import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/shared/auth-provider";
import { NavigationLoader } from "@/components/shared/navigation-loader";
import { Suspense } from "react";
import { MotionConfig } from "framer-motion";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
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
  title: "E-ARI — Enterprise AI Readiness Assessment",
  description: "Enterprise-grade AI readiness assessment platform. Measure, score, and strategize your organization's AI maturity across 8 critical pillars.",
  keywords: ["AI readiness", "enterprise assessment", "AI maturity", "digital transformation", "AI strategy"],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <Suspense>
              <NavigationLoader />
            </Suspense>
            {children}
            <Toaster />
          </MotionConfig>
        </AuthProvider>
      </body>
    </html>
  );
}
