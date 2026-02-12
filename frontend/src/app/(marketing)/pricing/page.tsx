import type { Metadata } from "next";
import Link from "next/link";

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
  alternates: { canonical: "https://disposight.com/pricing" },
};

const plans = [
  {
    name: "Professional",
    price: "$199",
    period: "/month",
    features: [
      "All 4 data pipelines (WARN, GDELT, SEC, Court)",
      "Real-time, daily & weekly alerts",
      "200 watchlist companies",
      "Full 8-factor deal scoring",
      "Signal correlation & risk trends",
      "CSV export",
      "Full signal history",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    href: "/register",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Professional",
      "Unlimited watchlist companies",
      "Multi-user team access",
      "Custom data sources",
      "API access",
      "Priority support & SLA",
      "SSO / SAML",
    ],
    cta: "Contact Sales",
    highlighted: false,
    href: "mailto:sales@disposight.com",
  },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            3-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-8 rounded-xl flex flex-col"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: plan.highlighted ? "2px solid var(--accent)" : "1px solid var(--border-default)",
                boxShadow: plan.highlighted ? "0 0 30px rgba(16, 185, 129, 0.1)" : "0 2px 12px rgba(0, 0, 0, 0.2)",
              }}
            >
              {plan.highlighted && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full self-start mb-4"
                  style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  3-day free trial
                </span>
              )}
              <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                {plan.name}
              </h3>
              <div className="flex items-end gap-1 mb-8">
                <span className="text-4xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  {plan.price}
                </span>
                <span className="text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent)" }}>+</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className="block w-full py-3 rounded-md text-sm font-medium text-center transition-colors"
                style={{
                  backgroundColor: plan.highlighted ? "var(--accent)" : "var(--bg-elevated)",
                  color: plan.highlighted ? "#fff" : "var(--text-secondary)",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
