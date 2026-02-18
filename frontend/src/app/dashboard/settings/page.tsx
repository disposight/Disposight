"use client";

import { useEffect, useState } from "react";
import { api, type UserProfile, type GapPreferences } from "@/lib/api";
import { UpgradeFlow } from "@/components/dashboard/checkout";
import { useRevenue } from "@/contexts/revenue-context";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const SIGNAL_TYPES_LIST = [
  "layoff", "bankruptcy_ch7", "bankruptcy_ch11", "merger",
  "office_closure", "plant_closing", "liquidation", "restructuring",
  "ceasing_operations", "facility_shutdown", "acquisition", "relocation",
];

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const { pricePerDevice, setPricePerDevice } = useRevenue();
  const [priceInput, setPriceInput] = useState(String(pricePerDevice));
  const [priceSaved, setPriceSaved] = useState(false);

  // Gap preferences
  const [gapPrefs, setGapPrefs] = useState<GapPreferences>({
    states: [], industries: [], signal_types: [], min_deal_score: 0,
  });
  const [industryInput, setIndustryInput] = useState("");
  const [gapSaved, setGapSaved] = useState(false);
  const [gapLoading, setGapLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
    api
      .getGapPreferences()
      .then(setGapPrefs)
      .catch(() => {})
      .finally(() => setGapLoading(false));
  }, []);

  useEffect(() => {
    setPriceInput(String(pricePerDevice));
  }, [pricePerDevice]);

  const isPaidUser =
    !!user?.plan && !["free", "trialing"].includes(user.plan);

  const handleManageBilling = async () => {
    if (isPaidUser) {
      // Existing subscribers go to Stripe portal for cancellation, invoices, etc.
      setBillingLoading(true);
      try {
        const { portal_url } = await api.getPortal();
        window.location.href = portal_url;
      } catch {
        // Fallback: show upgrade flow if portal fails (no subscription yet)
        setShowUpgrade(true);
      } finally {
        setBillingLoading(false);
      }
    } else {
      setShowUpgrade(true);
    }
  };

  const handleUpgradeComplete = () => {
    setShowUpgrade(false);
    // Refresh user data to reflect new plan
    api
      .getMe()
      .then(setUser)
      .catch(() => {});
  };

  const handleSavePrice = () => {
    const num = parseFloat(priceInput);
    if (num > 0 && num <= 10000) {
      setPricePerDevice(num);
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 2000);
    }
  };

  const toggleGapState = (st: string) => {
    setGapPrefs((p) => ({
      ...p,
      states: p.states.includes(st) ? p.states.filter((s) => s !== st) : [...p.states, st],
    }));
  };

  const toggleGapSignalType = (t: string) => {
    setGapPrefs((p) => ({
      ...p,
      signal_types: p.signal_types.includes(t)
        ? p.signal_types.filter((s) => s !== t)
        : [...p.signal_types, t],
    }));
  };

  const addIndustry = () => {
    const trimmed = industryInput.trim();
    if (trimmed && !gapPrefs.industries.includes(trimmed)) {
      setGapPrefs((p) => ({ ...p, industries: [...p.industries, trimmed] }));
      setIndustryInput("");
    }
  };

  const removeIndustry = (ind: string) => {
    setGapPrefs((p) => ({ ...p, industries: p.industries.filter((i) => i !== ind) }));
  };

  const handleSaveGapPrefs = async () => {
    try {
      await api.updateGapPreferences(gapPrefs);
      setGapSaved(true);
      setTimeout(() => setGapSaved(false), 2000);
    } catch {
      // ignore
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

      {/* Deal Discovery Preferences */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Deal Discovery Preferences
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Customize which uncovered opportunities are highlighted on your dashboard. Leave empty to auto-detect from your pipeline.
        </p>

        {gapLoading ? (
          <div className="h-24 rounded animate-pulse" style={{ backgroundColor: "var(--bg-base)" }} />
        ) : (
          <div className="space-y-5">
            {/* States */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                States
              </label>
              <div className="flex flex-wrap gap-1">
                {US_STATES.map((st) => {
                  const active = gapPrefs.states.includes(st);
                  return (
                    <button
                      key={st}
                      onClick={() => toggleGapState(st)}
                      className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                      style={{
                        backgroundColor: active ? "var(--accent-muted)" : "var(--bg-base)",
                        color: active ? "var(--accent)" : "var(--text-muted)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--border-default)"}`,
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industries */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Industries
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {gapPrefs.industries.map((ind) => (
                  <span
                    key={ind}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    {ind}
                    <button
                      onClick={() => removeIndustry(ind)}
                      className="hover:opacity-70"
                      style={{ color: "var(--accent)" }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={industryInput}
                  onChange={(e) => setIndustryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIndustry()}
                  placeholder="Add industry..."
                  className="flex-1 px-3 py-1.5 rounded-md text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={addIndustry}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Signal Types */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Signal Types
              </label>
              <div className="flex flex-wrap gap-1">
                {SIGNAL_TYPES_LIST.map((t) => {
                  const active = gapPrefs.signal_types.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleGapSignalType(t)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: active ? "var(--accent-muted)" : "var(--bg-base)",
                        color: active ? "var(--accent)" : "var(--text-muted)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--border-default)"}`,
                      }}
                    >
                      {t.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min Deal Score */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Minimum Deal Score: {gapPrefs.min_deal_score}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={gapPrefs.min_deal_score}
                onChange={(e) =>
                  setGapPrefs((p) => ({ ...p, min_deal_score: Number(e.target.value) }))
                }
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>0</span>
                <span>100</span>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveGapPrefs}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {gapSaved ? "Saved!" : "Save Preferences"}
            </button>
          </div>
        )}
      </div>

      {/* Billing */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Billing
        </h2>
        <button
          onClick={handleManageBilling}
          disabled={billingLoading}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {billingLoading ? "Loading..." : "Manage Billing"}
        </button>
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUpgrade(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl p-6 shadow-2xl"
            style={{
              backgroundColor: "#2a2a35",
              border: "1px solid var(--border-default)",
            }}
          >
            <UpgradeFlow
              onComplete={handleUpgradeComplete}
              onCancel={() => setShowUpgrade(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
