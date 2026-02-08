import Link from "next/link";

const features = [
  {
    title: "WARN Act Monitoring",
    description: "Legally required layoff notices captured before anyone else acts on them.",
  },
  {
    title: "Bankruptcy Detection",
    description: "Chapter 7 and 11 filings from CourtListener. Forced liquidation means forced surplus.",
  },
  {
    title: "SEC Filing Analysis",
    description: "M&A and restructuring signals from 8-K filings. Mergers create duplicate infrastructure.",
  },
  {
    title: "News Intelligence",
    description: "GDELT-powered monitoring for closures, shutdowns, and relocations across global news.",
  },
  {
    title: "Risk Scoring",
    description: "AI-powered composite scoring with multi-source correlation. Know which leads to prioritize.",
  },
  {
    title: "Real-time Alerts",
    description: "Get notified instantly when high-value signals match your criteria. Beat the competition.",
  },
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
          Know about surplus hardware{" "}
          <span style={{ color: "var(--accent)" }}>before your competitors</span>
        </h1>
        <p
          className="text-lg max-w-2xl mx-auto mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          DispoSight detects corporate distress signals — layoffs, bankruptcies, closures, M&A — and
          delivers actionable intelligence to ITAD and liquidation teams within hours, not weeks.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-md text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Start Free Trial
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

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Stop relying on word of mouth
        </h2>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
          5-15 high-quality signals per week. 14-day free trial. No credit card required.
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
