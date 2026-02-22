import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | DispoSight Blog",
    default: "Blog | DispoSight",
  },
  description:
    "Distress intelligence insights — WARN Act analysis, bankruptcy guides, asset recovery strategies, and corporate distress signals for deal-driven organizations.",
  openGraph: {
    title: "DispoSight Blog",
    description:
      "Distress intelligence insights for deal-driven organizations.",
    url: "https://disposight.com/blog",
    siteName: "DispoSight",
    type: "website",
  },
  alternates: {
    canonical: "https://disposight.com/blog",
    types: { "application/rss+xml": "https://disposight.com/feed.xml" },
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
