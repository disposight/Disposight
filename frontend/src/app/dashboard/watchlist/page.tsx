"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type WatchlistItem } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { usePlan } from "@/contexts/plan-context";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  claimed: "Claimed",
  contacted: "Contacted",
  passed: "Passed",
};

const STATUS_COLORS: Record<string, string> = {
  watching: "var(--text-muted)",
  claimed: "var(--accent)",
  contacted: "var(--high)",
  passed: "var(--low)",
};

export default function WatchlistPage() {
  const { planLimits } = usePlan();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWatchlist()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    await api.removeFromWatchlist(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClaim = async (id: string) => {
    try {
      const updated = await api.claimLead(id);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch {}
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await api.updateLeadStatus(id, status);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch {}
  };

  return (
    <PlanGate>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Watchlist
          </h1>
          {planLimits && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              {items.length} / {planLimits.max_watchlist_companies}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="text-lg font-mono font-medium"
                    style={{ color: scoreColor(item.composite_risk_score ?? 0) }}
                  >
                    {item.composite_risk_score ?? 0}
                  </span>
                  <div>
                    <Link
                      href={`/dashboard/opportunities/${item.company_id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.company_name || "Unknown"}
                    </Link>
                    {item.notes && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  <select
                    value={item.status || "watching"}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    className="px-2 py-1 rounded text-xs outline-none"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      color: STATUS_COLORS[item.status || "watching"],
                    }}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  {/* Claim button (if watching) */}
                  {(item.status === "watching" || !item.status) && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      className="text-xs px-3 py-1 rounded font-medium transition-colors"
                      style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      Claim
                    </button>
                  )}

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-xs px-3 py-1 rounded transition-colors"
                    style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No companies in watchlist</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Add companies from the{" "}
              <Link href="/dashboard" className="hover:underline" style={{ color: "var(--accent)" }}>
                Deals
              </Link>
              {" "}page
            </p>
          </div>
        )}
      </div>
    </PlanGate>
  );
}
