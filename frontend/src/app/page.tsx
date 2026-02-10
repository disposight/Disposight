import Link from "next/link";
import { AmbientEffects } from "@/components/ambient-effects";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Tooltip } from "@/components/tooltip";
import { CountUp } from "@/components/count-up";

const sourceTooltips: Record<string, string> = {
  "SEC EDGAR": "U.S. Securities and Exchange Commission filings — 8-K reports on M&A, restructuring, and asset impairments",
  "Dept. of Labor": "WARN Act filings — 60-day advance notices of mass layoffs and plant closures",
  "US Bankruptcy Courts": "Chapter 7 & 11 bankruptcy filings from federal courts via CourtListener",
  "GDELT News": "Global news monitoring — AI detects closures, shutdowns, and liquidation events",
  "GlobeNewswire": "Corporate press releases on restructuring, divestitures, and acquisitions",
};

const badgeTooltips: Record<string, string> = {
  WARN: "WARN Act filing — federal layoff notice requiring 60-day advance warning",
  NEWS: "Detected from global news sources and corporate press releases",
  SEC: "SEC EDGAR 8-K filing — mandatory disclosure of material corporate events",
  COURT: "Federal bankruptcy court filing — Chapter 7 (liquidation) or Chapter 11 (reorganization)",
};

const scoreTooltip = "Deal score (0–100) — higher means greater likelihood of surplus IT equipment becoming available";

const pipelines = [
  {
    icon: "WARN",
    title: "WARN Act Filings",
    benefit: "60-day advance warning",
    description:
      "Mass layoff notices filed with the Dept. of Labor. Legal filings = verified data, not rumors.",
  },
  {
    icon: "COURT",
    title: "Bankruptcy Filings",
    benefit: "Liquidation triggers",
    description:
      "Chapter 7 & 11 filings from federal courts. Bankruptcies force equipment disposition on a deadline.",
  },
  {
    icon: "SEC",
    title: "SEC EDGAR 8-K",
    benefit: "M&A and restructuring",
    description:
      "Exit activities, asset impairments, and facility closures disclosed in public filings.",
  },
  {
    icon: "NEWS",
    title: "News & Press Releases",
    benefit: "Real-time coverage",
    description:
      "AI scans global news and corporate press releases for closures, relocations, and downsizing.",
  },
];

const steps = [
  {
    number: "01",
    title: "Monitor",
    subtitle: "5 data sources scanned continuously",
    description:
      "Federal filings, court records, SEC disclosures, news, and corporate press releases. Every signal captured automatically.",
  },
  {
    number: "02",
    title: "Analyze",
    subtitle: "AI scores every signal",
    description:
      "Each event is scored on confidence, severity, and likelihood of producing 100+ surplus devices. Low-quality noise is filtered out.",
  },
  {
    number: "03",
    title: "Prioritize",
    subtitle: "Deal-ranked opportunities",
    description:
      "Companies are ranked by deal score — factoring device volume, urgency, source trust, and corroboration across pipelines.",
  },
  {
    number: "04",
    title: "Act First",
    subtitle: "Alerts delivered to your inbox",
    description:
      "Real-time, daily, or weekly alerts. Your team reaches out while competitors are still Googling.",
  },
];

const proofPoints = [
  {
    end: 233,
    prefix: "",
    suffix: "+",
    label: "Companies tracked",
    context: "with active distress signals",
    duration: 2200,
  },
  {
    end: 318,
    prefix: "",
    suffix: "",
    label: "Actionable signals",
    context: "past the 100-device threshold",
    duration: 2400,
  },
  {
    end: 5,
    prefix: "",
    suffix: "",
    label: "Data pipelines",
    context: "federal, legal, and news sources",
    duration: 1200,
  },
  {
    end: 24,
    prefix: "<",
    suffix: "h",
    label: "Detection speed",
    context: "from filing to your dashboard",
  },
];

const testimonials = [
  {
    quote:
      "We used to find out about deals through word of mouth, weeks after our competitors. DispoSight changed that completely.",
    role: "VP of Acquisitions",
    company: "National ITAD Provider",
  },
  {
    quote:
      "The signal correlation is the killer feature. When a company shows up in WARN filings AND bankruptcy court, we know it's real.",
    role: "Director of Operations",
    company: "Regional Liquidation Firm",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "var(--bg-base)" }}>
      <AmbientEffects />

      {/* All content above ambient layer */}
      <div className="relative z-10">
      {/* Nav */}
      <nav className="hero-nav flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="DispoSight" className="h-8" />
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
            DispoSight
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/pricing"
            className="text-sm hidden sm:inline transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-md text-sm font-medium transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 text-center">
        <p
          className="hero-label text-xs sm:text-sm font-medium uppercase tracking-widest mb-4 sm:mb-6"
          style={{ color: "var(--accent)" }}
        >
          Subscription intelligence for ITAD &amp; liquidation
        </p>
        <h1
          className="hero-heading text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] mb-6 sm:mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          Detect surplus IT equipment{" "}
          <span style={{ color: "var(--accent)" }}>before your competitors</span>
        </h1>
        <p
          className="hero-subtitle text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          DispoSight monitors layoffs, bankruptcies, closures, and M&amp;A across
          federal databases and news — then ranks which companies are most likely
          to have hardware you can buy.
        </p>
        <div className="hero-cta flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-md text-sm font-semibold w-full sm:w-auto text-center transition-all hover:brightness-110"
              style={{
                backgroundColor: "var(--accent)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)",
              }}
            >
              Start Free Trial
            </Link>
            <Link
              href="#live-signals"
              className="px-8 py-3.5 rounded-md text-sm font-medium w-full sm:w-auto text-center transition-all hover:brightness-110"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-strong)",
              }}
            >
              See Live Signals
            </Link>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Free 3-day trial &middot; No credit card required
          </span>
        </div>
      </section>

      {/* Source credibility */}
      <section className="hero-sources max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <p
          className="text-[11px] text-center mb-4 uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Sourced from public federal &amp; legal databases
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["SEC EDGAR", "Dept. of Labor", "US Bankruptcy Courts", "GDELT News", "GlobeNewswire"].map(
            (source) => (
              <Tooltip key={source} text={sourceTooltips[source]} position="bottom">
                <span
                  className="px-4 py-2 rounded-full text-xs font-medium cursor-help"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {source}
                </span>
              </Tooltip>
            )
          )}
        </div>
      </section>

      {/* Live signal preview */}
      <section id="live-signals" className="hero-preview max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-default)" }}
          >
            <div className="flex gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-muted)", opacity: 0.3 }}
              />
            </div>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              Live intelligence dashboard
            </span>
            <span
              className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--accent)" }}
            >
              LIVE
            </span>
          </div>
          {/* Dashboard content */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                { label: "Active Signals", value: "318", sub: "past device threshold" },
                { label: "Companies", value: "233", sub: "under surveillance" },
                { label: "High Priority", value: "47", sub: "score 70+" },
                { label: "New This Week", value: "24", sub: "fresh detections" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 sm:p-4 rounded-lg"
                  style={{
                    backgroundColor: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
                    {stat.label}
                  </p>
                  <p
                    className="text-xl sm:text-2xl font-bold"
                    style={{
                      color: "var(--accent)",
                      fontFamily: "var(--font-geist-mono, monospace)",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                {
                  company: "Macy's Inc.",
                  signal: "WARN Act — 2,300 employees affected",
                  type: "WARN",
                  risk: "92",
                },
                {
                  company: "Wells Fargo",
                  signal: "Facility closure — Houston TX campus",
                  type: "NEWS",
                  risk: "87",
                },
                {
                  company: "Thermo Fisher Scientific",
                  signal: "8-K Item 2.05 — Exit activities, $42M charge",
                  type: "SEC",
                  risk: "78",
                },
                {
                  company: "Phillips 66",
                  signal: "Chapter 11 bankruptcy filing",
                  type: "COURT",
                  risk: "95",
                },
              ].map((row) => (
                <div
                  key={row.company}
                  className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Tooltip text={badgeTooltips[row.type]} position="right">
                      <span
                        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-help"
                        style={{
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          color: "var(--accent)",
                        }}
                      >
                        {row.type}
                      </span>
                    </Tooltip>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.company}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {row.signal}
                      </p>
                    </div>
                  </div>
                  <Tooltip text={scoreTooltip} position="left">
                    <span
                      className="shrink-0 text-xs font-mono font-bold px-2 py-1 rounded cursor-help"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        color: "var(--accent)",
                      }}
                    >
                      {row.risk}
                    </span>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Pain Point */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2
          className="text-2xl sm:text-3xl font-bold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Your competitors already know.
          <br />
          <span style={{ color: "var(--text-muted)" }}>Do you?</span>
        </h2>
        <p
          className="text-base sm:text-lg leading-relaxed mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Most ITAD and liquidation teams rely on word of mouth, cold calls, and manual
          Google Alerts. By the time you hear about a deal, someone else has already
          made the call.
        </p>
        <p
          className="text-base sm:text-lg font-semibold"
          style={{ color: "var(--accent)" }}
        >
          DispoSight gives you the signal first — automatically.
        </p>
      </section>
      </ScrollReveal>

      {/* How It Works — 4-step flow */}
      <ScrollReveal stagger={120}>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14 sm:mb-16">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            How it works
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            From filing to lead in hours, not weeks
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="sr-item relative">
              {/* Connector line (hidden on mobile, visible on lg) */}
              {i < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-6 left-full w-full h-px"
                  style={{ backgroundColor: "var(--border-default)" }}
                />
              )}
              <div
                className="text-xs font-mono font-bold mb-3"
                style={{ color: "var(--accent)" }}
              >
                {step.number}
              </div>
              <h3
                className="text-lg font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--accent)" }}>
                {step.subtitle}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* Pipelines */}
      <ScrollReveal stagger={100}>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14 sm:mb-16">
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
            Five sources. One intelligence feed.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {pipelines.map((pipe) => (
            <div
              key={pipe.title}
              className="sr-item p-6 rounded-xl transition-all hover:translate-y-[-2px]"
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
                  {pipe.icon}
                </span>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {pipe.title}
                </h3>
              </div>
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--accent)" }}
              >
                {pipe.benefit}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {pipe.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* Live data proof */}
      <ScrollReveal stagger={80}>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            Live platform data
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Real signals. Right now.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {proofPoints.map((stat) => (
            <div
              key={stat.label}
              className="sr-item p-5 rounded-xl text-center"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <p
                className="text-3xl font-bold mb-1"
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}
              >
                <CountUp
                  end={stat.end}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={stat.duration}
                />
              </p>
              <p
                className="text-sm font-medium mb-0.5"
                style={{ color: "var(--text-primary)" }}
              >
                {stat.label}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {stat.context}
              </p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* Social proof */}
      <ScrollReveal stagger={150}>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            Early adopters
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Teams already gaining an edge
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.role}
              className="sr-item p-6 rounded-xl"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {t.role}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* Bottom CTA */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Stop finding out last
        </h2>
        <p
          className="text-base sm:text-lg mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Every day without DispoSight is a deal your competitor closed first.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/register"
            className="inline-block px-10 py-3.5 rounded-md text-sm font-semibold transition-all hover:brightness-110"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(16, 185, 129, 0.2)",
            }}
          >
            Start Free Trial
          </Link>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Free 3-day trial &middot; No credit card &middot; Cancel anytime
          </span>
        </div>
      </section>
      </ScrollReveal>

      {/* Footer */}
      <footer
        className="border-t px-4 sm:px-6 py-8 sm:py-10"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="DispoSight" className="h-5 opacity-60" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              DispoSight
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Sign In
            </Link>
            <a
              href="mailto:support@disposight.com"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
