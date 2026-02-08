"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type WatchlistItem } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

export default function WatchlistPage() {
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

  return (
    <PlanGate>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Watchlist
      </h1>

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
                    href={`/dashboard/companies/${item.company_id}`}
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
              <button
                onClick={() => handleRemove(item.id)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No companies in watchlist</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Add companies from the Companies page to track them here
          </p>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
