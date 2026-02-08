import Link from "next/link";

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
    price: "$299",
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
          <Link href="/" className="text-lg font-bold mb-8 inline-block" style={{ color: "var(--accent)" }}>
            DispoSight
          </Link>
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            3-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-6 rounded-lg"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: plan.highlighted ? "2px solid var(--accent)" : "1px solid var(--border-default)",
              }}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {plan.name}
              </h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-3xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  {plan.price}
                </span>
                <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent)" }}>+</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-2 rounded-md text-sm font-medium text-center transition-colors"
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
