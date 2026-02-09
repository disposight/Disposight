"use client";

import { useState } from "react";

const faqItems = [
  {
    q: "What is DispoSight?",
    a: "DispoSight is a subscription intelligence platform built for ITAD (IT Asset Disposition) and liquidation companies. It detects early signals of corporate distress — layoffs, bankruptcies, facility closures, and M&A activity — and delivers actionable leads so you can reach out before competitors.",
  },
  {
    q: "What types of signals does DispoSight track?",
    a: "DispoSight tracks four categories of signals: WARN Act layoff notices, news events from GDELT (closures, shutdowns, liquidation mentions), SEC EDGAR 8-K filings related to M&A and restructuring, and CourtListener bankruptcy filings (Chapter 7 and Chapter 11). Each signal is classified by type, severity, and estimated device count.",
  },
  {
    q: "How often is data updated?",
    a: "Each data pipeline runs on its own schedule. WARN Act data is checked daily as states publish new notices. GDELT news monitoring runs every few hours to catch breaking stories. SEC EDGAR filings are polled multiple times per day. CourtListener bankruptcy filings are checked daily. You can see pipeline health status on the Dashboard overview page.",
  },
  {
    q: "What does the risk score mean?",
    a: "The risk score (0–100) is a composite metric that reflects how likely a company is to generate surplus IT equipment. It combines multiple factors: the number and severity of signals, signal recency, signal type diversity, and historical patterns. A score above 70 is considered high-risk and likely worth immediate outreach. Scores between 40–70 are moderate and worth monitoring.",
  },
  {
    q: "How is the device estimate calculated?",
    a: "The device estimate uses our NLP pipeline to analyze signal details — employee counts from WARN notices, facility sizes from news articles, company headcount data — and applies industry-standard ratios (typically 1–1.5 devices per affected employee) to estimate how many surplus devices an event could produce. Only signals estimated to produce 100+ devices pass our critical filter.",
  },
  {
    q: "What is the WARN Act and why does it matter?",
    a: "The Worker Adjustment and Retraining Notification (WARN) Act requires employers with 100+ employees to provide 60-day advance notice before mass layoffs or plant closings. This is one of the most reliable leading indicators of surplus IT equipment because it gives you structured data (company, location, employee count, effective date) weeks before equipment actually becomes available.",
  },
  {
    q: "How do I add a company to my watchlist?",
    a: "Navigate to the Companies page, find the company you want to monitor, and click the star/watchlist icon. You can also add companies directly from the Watchlist page using the search function. Watchlisted companies will trigger alerts when new signals are detected, based on your alert configuration.",
  },
  {
    q: "How do email alerts work?",
    a: "You can configure alerts on the Alerts page. Choose which signal types matter to you, set severity thresholds, and select your delivery preference — real-time (immediate email per signal), daily digest (summary once per day), or weekly digest. Alerts are scoped to your watchlisted companies and filter preferences.",
  },
  {
    q: "What's the difference between confidence and severity scores?",
    a: "Confidence (0–1.0) measures how certain we are that the signal is accurate and correctly classified — higher means more reliable source data and NLP extraction. Severity (low/medium/high/critical) measures the potential business impact — a confirmed 5,000-person layoff is critical severity, while a rumored office downsizing might be low. Both are important: a high-confidence, high-severity signal is your best lead.",
  },
  {
    q: "Can I filter signals by location or type?",
    a: "Yes. The Signals page includes filters for signal type (layoff, bankruptcy, facility_shutdown, acquisition, restructuring), severity level, date range, and source pipeline. The Map page lets you explore signals geographically — zoom into specific regions and click markers for details.",
  },
  {
    q: "What data sources does DispoSight use?",
    a: "DispoSight aggregates data from four authoritative sources: (1) WARN Act notices from the U.S. Department of Labor and individual state websites, (2) GDELT Project for global news monitoring, (3) SEC EDGAR for public company filings (8-K reports on M&A, restructuring), and (4) CourtListener RECAP archive for federal bankruptcy court filings.",
  },
  {
    q: "How does signal correlation work?",
    a: "Our NLP pipeline automatically links related signals to the same company. For example, if a WARN Act notice mentions \"Acme Corp\" layoffs in Ohio, and a GDELT article reports \"Acme Corporation closing midwest facility,\" the system recognizes these refer to the same entity and correlates them. Correlated signals strengthen the overall risk assessment for that company.",
  },
  {
    q: "What does \"facility_shutdown\" vs \"layoff\" mean?",
    a: "These are signal type classifications. A \"layoff\" indicates workforce reduction — the company is cutting employees but may continue operations. A \"facility_shutdown\" indicates a physical location is closing entirely, which typically means all equipment at that site becomes surplus. Facility shutdowns generally produce more equipment per event than layoffs.",
  },
  {
    q: "How do I interpret the map markers?",
    a: "Map markers are color-coded by signal severity: green for low, yellow for medium, orange for high, and red for critical. Marker size reflects estimated device count — larger markers mean more potential equipment. Click any marker to see the signal details, company name, and estimated device count.",
  },
  {
    q: "Is my data private?",
    a: "Yes. DispoSight uses multi-tenant architecture with Row-Level Security (RLS) enforced at the database level. Your watchlists, alert configurations, and account data are completely isolated from other tenants. Signal and company data is shared across the platform (since it comes from public sources), but your selections and preferences are private to your organization.",
  },
];

const guidesSections = [
  {
    title: "Getting Started",
    content: [
      "DispoSight helps ITAD and liquidation companies find leads before the competition. After signing up, you land on the Dashboard — your command center for tracking corporate distress signals across the United States.",
      "Your first steps should be: (1) review the Dashboard overview to understand current signal volume, (2) browse the Companies page to find organizations relevant to your territory, (3) add key companies to your Watchlist, and (4) configure Alerts so you're notified when new signals match your criteria.",
    ],
  },
  {
    title: "Navigating the Dashboard",
    content: [
      "The Dashboard overview shows four key metrics at the top: total signals detected, active companies being tracked, your watchlist size, and pipeline health status. Below that you'll find recent signals and trending companies.",
      "Use the sidebar to navigate between sections. The Intelligence group (Overview, Signals, Companies, Map) is for exploring data. Configuration (Watchlist, Alerts) is for personalizing your experience. Account (Settings, Help) manages your profile and billing.",
    ],
  },
  {
    title: "Working with Signals",
    content: [
      "Signals are the core of DispoSight — each one represents a detected event that could indicate surplus IT equipment. Navigate to the Signals page to see all signals in reverse chronological order.",
      "Each signal card shows: the signal type (layoff, bankruptcy, facility_shutdown, etc.), the source pipeline (WARN Act, GDELT, SEC EDGAR, CourtListener), severity level, confidence score, estimated device count, and the associated company.",
      "Use the filters at the top to narrow results by type, severity, date range, or source. Click any signal to see the full details including the raw source data and NLP analysis.",
    ],
  },
  {
    title: "Monitoring Companies",
    content: [
      "The Companies page lists all organizations that have triggered at least one signal. Each company card displays a composite risk score (0–100), the number of associated signals, the most recent signal date, and trend direction.",
      "Click a company to see its full signal history, risk score breakdown, and correlated events across multiple data sources. Companies with scores above 70 are highlighted as high-risk and are your strongest leads for outreach.",
    ],
  },
  {
    title: "Using the Signal Map",
    content: [
      "The Map page provides a geographic view of all signals. Markers are color-coded by severity (green → yellow → orange → red) and sized by estimated device count.",
      "Zoom into specific regions to find signals in your service territory. Click any marker to see signal details. Use the filter controls to show only certain signal types or severity levels.",
      "The map uses dark-themed CartoDB tiles to match the DispoSight interface and provides cluster grouping when zoomed out to prevent marker overlap.",
    ],
  },
  {
    title: "Managing Your Watchlist",
    content: [
      "Your Watchlist is your personalized set of companies to monitor closely. Adding a company to your watchlist means you'll receive alerts when new signals are detected for that company.",
      "To add a company: go to the Companies page and click the star icon, or use the search on the Watchlist page. To remove a company, click the star icon again to un-star it.",
      "Watchlist data is private to your organization — other tenants cannot see which companies you're monitoring.",
    ],
  },
  {
    title: "Setting Up Alerts",
    content: [
      "Navigate to the Alerts page to configure your notification preferences. You can create alert rules based on: signal type (e.g., only bankruptcies), severity threshold (e.g., high and critical only), and geographic region.",
      "Choose your delivery method: real-time alerts send an email immediately when a matching signal is detected. Daily digests compile all matching signals into one email sent each morning. Weekly digests provide a summary every Monday.",
      "Alert rules only apply to companies on your watchlist. To receive alerts for a company, make sure it's been added to your watchlist first.",
    ],
  },
  {
    title: "Understanding Data Sources",
    content: [
      "WARN Act: The most structured source. Provides company name, location, number of affected employees, and layoff/closure date. Data comes from the U.S. Department of Labor and individual state workforce agencies. Typically gives 60 days advance notice.",
      "GDELT: Monitors global news in near-real-time. Catches facility closures, liquidation announcements, and shutdown news that may not appear in official filings. Higher volume but lower structure — our NLP pipeline extracts and classifies the relevant details.",
      "SEC EDGAR: Tracks 8-K filings from publicly traded companies. These mandatory filings report material events including mergers, acquisitions, and restructuring plans. Highly reliable but only covers public companies.",
      "CourtListener: Monitors federal bankruptcy court filings via the RECAP archive. Tracks both Chapter 7 (liquidation) and Chapter 11 (reorganization) filings. Bankruptcy often signals large-scale equipment disposal.",
    ],
  },
  {
    title: "Reading Risk Scores & Trends",
    content: [
      "Each company's risk score is a composite of: signal count (more signals = higher risk), signal severity (critical signals weigh more), signal recency (recent signals weigh more than old ones), signal diversity (multiple signal types increase risk), and estimated total device count.",
      "The trend indicator (↑ rising, → stable, ↓ declining) shows how the risk score has changed over the past 30 days. A rising trend on a high-risk company is your strongest signal to take action.",
      "Risk scores update automatically as new signals are ingested and old signals age out. Check the Deals page regularly to spot emerging deals.",
    ],
  },
  {
    title: "Account Settings",
    content: [
      "The Settings page shows your profile information (email, name, role), organization details (tenant name, current plan), and billing management.",
      "Click \"Manage Billing\" to access the Stripe customer portal where you can update payment methods, view invoices, or change your subscription plan.",
      "Your organization uses multi-tenant isolation — all users within your tenant share the same watchlist, alerts, and data. Contact your administrator to add or remove team members.",
    ],
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--border-default)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: "var(--text-primary)" }}
      >
        <span>{question}</span>
        <span
          className="ml-4 text-base flex-shrink-0 transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          className="pb-4 text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState<"faq" | "guide">("faq");

  return (
    <div className="space-y-6 max-w-3xl">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        Help
      </h1>

      {/* Tabs */}
      <div
        className="flex gap-0 rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border-default)" }}
      >
        <button
          onClick={() => setTab("faq")}
          className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === "faq" ? "var(--accent)" : "var(--bg-surface)",
            color: tab === "faq" ? "#fff" : "var(--text-secondary)",
          }}
        >
          FAQ
        </button>
        <button
          onClick={() => setTab("guide")}
          className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: tab === "guide" ? "var(--accent)" : "var(--bg-surface)",
            color: tab === "guide" ? "#fff" : "var(--text-secondary)",
          }}
        >
          How-to Guide
        </button>
      </div>

      {/* FAQ Tab */}
      {tab === "faq" && (
        <div
          className="rounded-lg"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-default)" }}>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Click a question to expand the answer.
            </p>
          </div>
          <div className="px-6">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <h2
          className="text-base font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Need help?
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Report a bug, request a feature, or reach out with any questions.
        </p>
        <a
          href="mailto:support@disposight.com"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
          }}
        >
          Contact Support
        </a>
      </div>

      {/* How-to Guide Tab */}
      {tab === "guide" && (
        <div className="space-y-4">
          {guidesSections.map((section, i) => (
            <div
              key={i}
              className="rounded-lg p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <h2
                className="text-base font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--accent-text)",
                  }}
                >
                  {i + 1}
                </span>
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.content.map((paragraph, j) => (
                  <p
                    key={j}
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
