import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About DispoSight — Corporate Distress Intelligence",
  description:
    "DispoSight is the AI-powered intelligence platform for deal-driven organizations. We monitor WARN Act filings, bankruptcy courts, SEC 8-K filings, and global news to surface asset disposition opportunities before your competitors.",
  openGraph: {
    title: "About DispoSight — Corporate Distress Intelligence",
    description:
      "AI-powered corporate distress intelligence. Monitor layoffs, bankruptcies, closures, and M&A to find asset deals first.",
    url: "https://disposight.com/about",
  },
  alternates: { canonical: "https://disposight.com/about" },
};

const pipelines = [
  {
    badge: "WARN",
    title: "WARN Act Filings",
    description:
      "Mass layoff notices filed with the Department of Labor. Legal requirement gives you 60 days advance warning before facilities close.",
  },
  {
    badge: "COURT",
    title: "Bankruptcy Courts",
    description:
      "Chapter 7 and Chapter 11 filings from federal courts via CourtListener. Bankruptcies force equipment liquidation on a deadline.",
  },
  {
    badge: "SEC",
    title: "SEC EDGAR 8-K",
    description:
      "Exit activities, asset impairments, and facility closures from mandatory corporate disclosures filed with the SEC.",
  },
  {
    badge: "NEWS",
    title: "Global News Monitoring",
    description:
      "AI scans thousands of news sources and press releases for closures, relocations, downsizing, and liquidation events.",
  },
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DispoSight",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered corporate distress intelligence platform. Monitors WARN Act filings, bankruptcy courts, SEC 8-K filings, and global news to surface asset disposition opportunities.",
    url: "https://disposight.com",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "99",
      highPrice: "199",
      priceCurrency: "USD",
      offerCount: "2",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Mission */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-4"
          style={{ color: "var(--accent)" }}
        >
          About DispoSight
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Corporate distress intelligence for deal teams
        </h1>
        <p
          className="text-base sm:text-lg leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Most acquisition teams rely on word of mouth, cold calls, and
          manual Google Alerts. By the time they hear about a deal, a competitor
          has already made the call. DispoSight changes that by monitoring public
          data sources continuously and surfacing disposition opportunities automatically.
        </p>
      </section>

      {/* Problem */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div
          className="p-6 sm:p-8 rounded-xl"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            The problem we solve
          </h2>
          <p
            className="text-sm leading-relaxed mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            When a company lays off thousands of workers, closes a facility, or
            files for bankruptcy, they typically have hundreds or thousands of
            corporate assets — equipment, furniture, IT infrastructure — that need
            to be disposed of or liquidated.
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            The companies that hear about these events first win the deal. DispoSight
            monitors the same federal databases, court systems, and news sources that
            would take a team of analysts hours to check manually — and delivers
            scored, prioritized leads to your dashboard and inbox.
          </p>
        </div>
      </section>

      {/* 4 Pipelines */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-12">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            Data pipelines
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Four verified data sources
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {pipelines.map((pipe) => (
            <div
              key={pipe.title}
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    color: "var(--accent)",
                  }}
                >
                  {pipe.badge}
                </span>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {pipe.title}
                </h3>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {pipe.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Analysis */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-12">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            AI-powered analysis
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Every signal scored and ranked
          </h2>
        </div>
        <div className="space-y-4">
          {[
            {
              title: "Entity extraction",
              description:
                "AI identifies company names, locations, employee counts, and asset details from unstructured filings and news articles.",
            },
            {
              title: "Signal classification",
              description:
                "Each event is categorized by type — layoff, closure, bankruptcy, M&A, restructuring — and assessed for asset disposition relevance.",
            },
            {
              title: "Asset threshold filter",
              description:
                "Only events likely to produce 100+ estimated assets make it to your dashboard. Low-value noise is automatically discarded.",
            },
            {
              title: "Deal scoring",
              description:
                "Companies are ranked 0–100 based on device volume estimates, urgency, source credibility, and corroboration across multiple pipelines.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-xl"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: "var(--accent)" }}
        >
          Built for
        </p>
        <h2
          className="text-2xl sm:text-3xl font-bold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Deal-driven organizations
        </h2>
        <p
          className="text-base leading-relaxed mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Whether you run a corporate liquidation firm, a distressed-focused PE
          group, or an equipment remarketing operation, DispoSight gives your
          deal team the intelligence edge to reach companies before the competition.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3.5 rounded-md text-sm font-semibold transition-all hover:brightness-110"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)",
          }}
        >
          Start Free Trial
        </Link>
      </section>
    </>
  );
}
