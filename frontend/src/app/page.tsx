import Link from "next/link";

const features = [
  {
    title: "Layoff Notices",
    description:
      "Companies legally required to report mass layoffs. You see them within hours of filing.",
  },
  {
    title: "Bankruptcy Filings",
    description:
      "Chapter 7 & 11 filings that force companies to liquidate equipment.",
  },
  {
    title: "M&A Activity",
    description:
      "Mergers and restructurings from SEC filings. Mergers = duplicate IT infrastructure.",
  },
  {
    title: "Closure & Shutdown News",
    description:
      "AI monitors global news for facility closures, relocations, and downsizing.",
  },
  {
    title: "AI Risk Scoring",
    description:
      "Every signal scored on likelihood of producing 100+ surplus devices.",
  },
  {
    title: "Instant Alerts",
    description:
      "Get notified the moment a high-value opportunity matches your watchlist.",
  },
];

const dataSources = [
  "SEC EDGAR",
  "Dept. of Labor",
  "US Bankruptcy Courts",
  "Global News",
];

const steps = [
  {
    number: "1",
    title: "We Monitor",
    description: "4 federal and news data sources scanned continuously",
  },
  {
    number: "2",
    title: "AI Analyzes",
    description: "Each signal scored for device surplus potential",
  },
  {
    number: "3",
    title: "You Act First",
    description: "Prioritized leads delivered to your inbox daily",
  },
];

const stats = [
  { value: "233+", label: "Companies Tracked" },
  { value: "318", label: "Actionable Signals" },
  { value: "4", label: "Data Sources" },
  { value: "Daily", label: "Updated" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-4">
        <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          DispoSight
        </span>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Pricing
          </Link>
          <Link href="/login" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1
          className="text-5xl font-bold leading-tight mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Find companies dumping IT equipment —{" "}
          <span style={{ color: "var(--accent)" }}>before anyone else</span>
        </h1>
        <p
          className="text-lg max-w-2xl mx-auto mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          DispoSight monitors layoffs, bankruptcies, closures, and mergers across federal databases
          and news — then tells you which companies are about to have surplus hardware you can buy.
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded-md text-sm font-medium"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Start 3-Day Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 rounded-md text-sm font-medium"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              View Pricing
            </Link>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No credit card required
          </span>
        </div>
      </section>

      {/* Data Source Credibility Bar */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <p className="text-xs text-center mb-4" style={{ color: "var(--text-muted)" }}>
          Data sourced from
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {dataSources.map((source) => (
            <span
              key={source}
              className="px-4 py-2 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {source}
            </span>
          ))}
        </div>
      </section>

      {/* Dashboard Placeholder */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-default)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }} />
            </div>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              Live intelligence dashboard
            </span>
          </div>
          {/* Dashboard content */}
          <div className="p-6">
            {/* Stat cards row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Active Signals", value: "318" },
                { label: "Companies", value: "233" },
                { label: "High Risk", value: "47" },
                { label: "This Week", value: "24" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    {stat.label}
                  </p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--accent)", fontFamily: "var(--font-geist-mono, monospace)" }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            {/* Signal rows */}
            <div className="space-y-3">
              {[
                { company: "Macy's Inc.", signal: "WARN Act — 2,300 employees", risk: "High" },
                { company: "Wells Fargo", signal: "Facility closure — Houston TX", risk: "High" },
                { company: "Thermo Fisher", signal: "SEC 8-K — Restructuring", risk: "Medium" },
                { company: "Phillips 66", signal: "Chapter 11 Filing", risk: "High" },
              ].map((row) => (
                <div
                  key={row.company}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {row.company}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {row.signal}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: row.risk === "High" ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
                      color: "var(--accent)",
                    }}
                  >
                    {row.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Your team is finding out too late
        </h2>
        <p className="text-base mb-4" style={{ color: "var(--text-secondary)" }}>
          Today, most ITAD and liquidation teams rely on word of mouth, manual Google Alerts,
          and cold calls to find surplus inventory. By the time you hear about a deal,
          your competitor already has it.
        </p>
        <p className="text-base font-medium" style={{ color: "var(--accent)" }}>
          DispoSight automates this — and gets you there first.
        </p>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2
          className="text-2xl font-bold text-center mb-12"
          style={{ color: "var(--text-primary)" }}
        >
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold"
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "var(--accent)",
                }}
              >
                {step.number}
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2
          className="text-2xl font-bold text-center mb-12"
          style={{ color: "var(--text-primary)" }}
        >
          Four elite data pipelines. One intelligence platform.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-lg"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Data Proof */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2
          className="text-2xl font-bold text-center mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          Real data. Real signals. Right now.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-lg text-center"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--accent)", fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Stop finding out last
        </h2>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
          3-day free trial. No credit card required.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3 rounded-md text-sm font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            DispoSight
          </span>
          <div className="flex gap-6">
            <Link href="/pricing" className="text-xs" style={{ color: "var(--text-muted)" }}>
              Pricing
            </Link>
            <Link href="/login" className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
