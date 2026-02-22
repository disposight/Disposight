import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Professional Plan $199/mo",
  description:
    "Full access to corporate distress intelligence for $199/month. All 4 data pipelines, real-time alerts, deal scoring, CSV export. 3-day free trial, no credit card required.",
  openGraph: {
    title: "DispoSight Pricing — Corporate Distress Intelligence",
    description:
      "Professional plan at $199/mo. WARN Act, bankruptcy, SEC, and news monitoring with real-time alerts and deal scoring. Start with a free 3-day trial.",
    url: "https://disposight.com/pricing",
  },
  alternates: {
    canonical: "https://disposight.com/pricing",
    types: { "application/rss+xml": "https://disposight.com/feed.xml" },
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
