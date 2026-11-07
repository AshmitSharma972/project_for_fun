import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { CosmicBackdrop } from "@/components/cosmic-backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IncidentMind AI — Incidents, remembered.", template: "%s · IncidentMind AI" },
  description: "An evidence-led incident-response assistant. Bring alerts together with verified incident history and runbook guidance; keep recovery decisions in an engineer’s hands.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  alternates: { canonical: "/" },
  openGraph: { title: "IncidentMind AI", description: "Incidents, remembered.", type: "website", images: ["/og.svg"] },
  twitter: { card: "summary_large_image", title: "IncidentMind AI", description: "Evidence-led incident response." },
  icons: { icon: "/favicon.svg" },
};

export const viewport = { themeColor: "#050609", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet"/></head><body><a className="skip" href="#main-content">Skip to content</a><CosmicBackdrop /><QueryProvider>{children}</QueryProvider></body></html>;
}
