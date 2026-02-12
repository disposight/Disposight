"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  "All 4 data pipelines (WARN, GDELT, SEC, Court)",
  "Real-time, daily & weekly alerts",
  "200 watchlist companies",
  "Full 8-factor deal scoring",
  "Signal correlation & risk trends",
  "CSV export",
  "Full signal history",
];

const enterpriseFeatures = [
  "Everything in Professional",
  "Unlimited watchlist companies",
  "Multi-user team access",
  "Custom data sources",
  "API access",
  "Priority support & SLA",
  "SSO / SAML",
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const price = isYearly ? 175 : 199;

  return (
    <div className="px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-base mb-8" style={{ color: "var(--text-secondary)" }}>
            3-day free trial. No credit card required.
          </p>

          <div className="flex items-center justify-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: isYearly ? "var(--text-muted)" : "var(--text-primary)" }}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: isYearly ? "var(--accent)" : "#333" }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: isYearly ? "translateX(24px)" : "translateX(4px)" }}
              />
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: isYearly ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              Yearly
            </span>
            {isYearly && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
              >
                Save 12%
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Professional */}
          <div
            className="p-8 rounded-xl flex flex-col"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--accent)",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.1)",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full self-start mb-4"
              style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
            >
              3-day free trial
            </span>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Professional
            </h3>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                ${price}
              </span>
              <span className="text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
                /month
              </span>
            </div>
            {isYearly ? (
              <p className="text-xs mb-8" style={{ color: "var(--accent)" }}>
                $2,100/yr — save $288
              </p>
            ) : (
              <div className="mb-8" />
            )}
            <ul className="space-y-3 mb-10 flex-1">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent)" }}>+</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full py-3 rounded-md text-sm font-medium text-center transition-colors"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div
            className="p-8 rounded-xl flex flex-col"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Enterprise
            </h3>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-4xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                Custom
              </span>
            </div>
            <ul className="space-y-3 mb-10 flex-1">
              {enterpriseFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent)" }}>+</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="mailto:sales@disposight.com"
              className="block w-full py-3 rounded-md text-sm font-medium text-center transition-colors"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
