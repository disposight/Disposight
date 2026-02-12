"use client";

import { useState, useCallback } from "react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "@/lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "#111111",
    colorText: "#e5e5e5",
    colorTextSecondary: "#888888",
    colorDanger: "#ef4444",
    fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
    borderRadius: "6px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#0a0a0a",
      border: "1px solid #2a2a2a",
    },
    ".Input:focus": {
      borderColor: "#10b981",
      boxShadow: "0 0 0 1px #10b981",
    },
    ".Label": {
      color: "#888888",
    },
  },
};

const plan = {
  id: "starter",
  name: "Professional",
  monthly: { price: 199, priceId: "starter" },
  yearly: { price: 175, total: 2100, savings: 288, priceId: "starter_yearly" },
  features: [
    "All 4 data pipelines",
    "Real-time, daily & weekly alerts",
    "200 watchlist companies",
    "Full deal scoring & signal correlation",
    "CSV export",
    "Full signal history",
  ],
};

// Preserved for future use — Pro tier plan definition
// const proPlan = {
//   id: "pro",
//   name: "Pro",
//   monthly: { price: 399, priceId: "pro" },
//   yearly: { price: 339, total: 4068, savings: 720, priceId: "pro_yearly" },
//   features: [
//     "Everything in Professional",
//     "Multi-user team access",
//     "API access",
//     "Priority support",
//   ],
// };

function BillingToggle({
  isYearly,
  onChange,
}: {
  isYearly: boolean;
  onChange: (yearly: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className="text-sm font-medium"
        style={{ color: isYearly ? "var(--text-muted)" : "var(--text-primary)" }}
      >
        Monthly
      </span>
      <button
        type="button"
        onClick={() => onChange(!isYearly)}
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
  );
}

function PaymentForm({
  planName,
  onBack,
  onComplete,
}: {
  planName: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      setSubmitting(false);
    } else {
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Subscribe to {planName}
        </h3>
        <button
          type="button"
          onClick={onBack}
          className="text-sm transition-colors hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          Back
        </button>
      </div>

      <PaymentElement />

      {error && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        {submitting ? "Processing..." : `Subscribe to ${planName}`}
      </button>
    </form>
  );
}

export function UpgradeFlow({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [isYearly, setIsYearly] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const handleSubscribe = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      setBillingPeriod(isYearly ? "yearly" : "monthly");

      const priceId = isYearly ? plan.yearly.priceId : plan.monthly.priceId;

      try {
        const { client_secret } = await api.subscribe(priceId);
        setClientSecret(client_secret);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start subscription"
        );
      } finally {
        setLoading(false);
      }
    },
    [isYearly]
  );

  const handleBack = useCallback(() => {
    setClientSecret(null);
    setError(null);
  }, []);

  const handlePaymentComplete = useCallback(() => {
    setSuccess(true);
    setTimeout(onComplete, 1500);
  }, [onComplete]);

  if (success) {
    return (
      <div className="text-center py-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "var(--accent-muted)" }}
        >
          <span className="text-2xl" style={{ color: "var(--accent)" }}>
            &#x2713;
          </span>
        </div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Subscription Active
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Welcome to {plan.name}. Refreshing your account...
        </p>
      </div>
    );
  }

  // Payment phase
  if (clientSecret) {
    const billingLabel =
      billingPeriod === "yearly"
        ? `${plan.name} (Yearly)`
        : plan.name;
    return (
      <div className="space-y-4">
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance }}
        >
          <PaymentForm
            planName={billingLabel}
            onBack={handleBack}
            onComplete={handlePaymentComplete}
          />
        </Elements>
      </div>
    );
  }

  const price = isYearly ? plan.yearly.price : plan.monthly.price;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Upgrade to {plan.name}
        </h3>
        <button
          onClick={onCancel}
          className="text-sm transition-colors hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
      </div>

      <BillingToggle isYearly={isYearly} onChange={setIsYearly} />

      {error && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <div
        className="rounded-lg p-5"
        style={{
          backgroundColor: "#32323e",
          border: "1px solid var(--accent)",
        }}
      >
        <h4
          className="text-sm font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {plan.name}
        </h4>
        <div className="flex items-baseline gap-0.5 mb-1">
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            ${price}
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            /month
          </span>
        </div>
        {isYearly && (
          <p className="text-xs mb-3" style={{ color: "var(--accent)" }}>
            ${plan.yearly.total}/yr — save ${plan.yearly.savings}
          </p>
        )}
        {!isYearly && <div className="mb-3" />}

        <ul className="space-y-2 mb-5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="mt-0.5 flex-shrink-0"
                style={{ color: "var(--accent)" }}
              >
                &#x2713;
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Loading..." : "Start 3-Day Free Trial"}
        </button>
      </div>
    </div>
  );
}
