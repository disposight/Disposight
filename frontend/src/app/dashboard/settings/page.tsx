"use client";

import { useEffect, useState } from "react";
import { api, type UserProfile } from "@/lib/api";
import { EmbeddedCheckout } from "@/components/dashboard/checkout";
import { useRevenue } from "@/contexts/revenue-context";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const { pricePerDevice, setPricePerDevice } = useRevenue();
  const [priceInput, setPriceInput] = useState(String(pricePerDevice));
  const [priceSaved, setPriceSaved] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPriceInput(String(pricePerDevice));
  }, [pricePerDevice]);

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const { portal_url } = await api.getPortal();
      window.location.href = portal_url;
    } catch {
      try {
        const { client_secret } = await api.createCheckout();
        setCheckoutSecret(client_secret);
      } catch {}
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSavePrice = () => {
    const num = parseFloat(priceInput);
    if (num > 0 && num <= 10000) {
      setPricePerDevice(num);
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Settings
      </h1>

      {/* Profile */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Profile
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Email</label>
            <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{user?.email || "---"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Name</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.full_name || "---"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Role</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.role || "---"}</p>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Organization
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Tenant</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.tenant_name || "---"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Plan</label>
            <p className="text-sm font-mono" style={{ color: "var(--accent-text)" }}>
              {user?.plan === "trialing" && user?.trial_ends_at
                ? `TRIAL (expires ${new Date(user.trial_ends_at).toLocaleDateString()})`
                : user?.plan?.toUpperCase() || "FREE"}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Settings */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Revenue Settings
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Set the average revenue per device to calculate pipeline values across all deals.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>$ per device:</label>
          <input
            type="number"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSavePrice()}
            className="w-24 px-3 py-2 rounded-md text-sm font-mono text-right outline-none"
            style={{
              backgroundColor: "var(--bg-base)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
            min="1"
            max="10000"
            step="1"
          />
          <button
            onClick={handleSavePrice}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {priceSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Billing */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Billing
        </h2>
        {checkoutSecret ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Complete your subscription below
              </p>
              <button
                onClick={() => setCheckoutSecret(null)}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
              >
                Cancel
              </button>
            </div>
            <EmbeddedCheckout clientSecret={checkoutSecret} />
          </div>
        ) : (
          <button
            onClick={handleManageBilling}
            disabled={billingLoading}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {billingLoading ? "Loading..." : "Manage Billing"}
          </button>
        )}
      </div>
    </div>
  );
}
