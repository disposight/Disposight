import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const siteUrl = "https://disposight.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DispoSight — Corporate Distress Intelligence",
    template: "%s | DispoSight",
  },
  description:
    "Corporate distress intelligence. Find asset deals before the competition. DispoSight monitors WARN Act filings, bankruptcy courts, SEC 8-K filings, and news to surface high-value disposition opportunities automatically.",
  keywords: [
    "corporate distress intelligence", "asset disposition", "surplus corporate assets", "disposition opportunities",
    "asset leads", "equipment remarketing", "asset acquisition", "WARN Act",
    "bankruptcy filings", "corporate distress signals", "asset recovery",
  ],
  openGraph: {
    type: "website",
    siteName: "DispoSight",
    locale: "en_US",
    url: siteUrl,
    title: "DispoSight — Corporate Distress Intelligence",
    description:
      "Corporate distress intelligence. Find asset deals before the competition. AI-powered monitoring of WARN Act, bankruptcy, SEC, and news signals.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DispoSight — Corporate Distress Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DispoSight — Corporate Distress Intelligence",
    description:
      "Corporate distress intelligence. Find asset deals before the competition. AI-powered monitoring of WARN Act, bankruptcy, SEC, and news signals.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DispoSight",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    "Corporate distress intelligence platform. Monitors WARN Act filings, bankruptcy courts, SEC 8-K filings, and global news to surface asset disposition opportunities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
