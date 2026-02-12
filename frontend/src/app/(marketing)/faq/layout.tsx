import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — DispoSight Corporate Distress Intelligence",
  description:
    "Frequently asked questions about DispoSight. Learn how our AI-powered platform monitors WARN Act filings, bankruptcy courts, SEC filings, and news to deliver disposition opportunities.",
  openGraph: {
    title: "FAQ — DispoSight Corporate Distress Intelligence",
    description:
      "Common questions about DispoSight's data sources, AI scoring, pricing, free trial, data security, and support.",
    url: "https://disposight.com/faq",
  },
  alternates: { canonical: "https://disposight.com/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
