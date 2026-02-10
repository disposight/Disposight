import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Plans Starting at $99/mo",
  description:
    "Simple, transparent pricing for ITAD intelligence. Starter plan from $99/month with all 4 data pipelines. Professional plan with real-time alerts and API access. 3-day free trial.",
  openGraph: {
    title: "DispoSight Pricing — ITAD Intelligence Plans",
    description:
      "Starter from $99/mo, Professional from $199/mo. All plans include WARN Act, bankruptcy, SEC, and news monitoring. Start with a free 3-day trial.",
    url: "https://disposight.com/pricing",
  },
  alternates: { canonical: "https://disposight.com/pricing" },
};

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    features: [
      "All 4 data pipelines",
      "50 watchlist companies",
      "Daily email digest",
      "1 team member",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$199",
    period: "/month",
    features: [
      "Everything in Starter",
      "200 watchlist companies",
      "Real-time alerts",
      "5 team members",
      "Signal correlation",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Professional",
      "Unlimited watchlist",
      "Unlimited team members",
      "Custom data sources",
      "Priority support",
      "SSO / SAML",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen px-4 py-20" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <img src="/logo.png" alt="DispoSight" className="h-8" />
            <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>DispoSight</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            3-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
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
                href="/register"
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
