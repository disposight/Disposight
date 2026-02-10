import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const siteUrl = "https://disposight.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DispoSight — ITAD Intelligence Platform",
    template: "%s | DispoSight",
  },
  description:
    "Detect surplus IT equipment before your competitors. DispoSight monitors WARN Act filings, bankruptcy courts, SEC 8-K filings, and news to surface high-value ITAD leads automatically.",
  keywords: [
    "ITAD", "IT asset disposition", "surplus IT equipment", "ITAD leads",
    "ITAD intelligence", "IT liquidation", "IT remarketing", "WARN Act",
    "bankruptcy filings", "corporate distress signals", "asset recovery",
  ],
  openGraph: {
    type: "website",
    siteName: "DispoSight",
    locale: "en_US",
    url: siteUrl,
    title: "DispoSight — ITAD Intelligence Platform",
    description:
      "Detect surplus IT equipment before your competitors. AI-powered monitoring of WARN Act, bankruptcy, SEC, and news signals.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DispoSight — ITAD Intelligence Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DispoSight — ITAD Intelligence Platform",
    description:
      "Detect surplus IT equipment before your competitors. AI-powered monitoring of WARN Act, bankruptcy, SEC, and news signals.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
