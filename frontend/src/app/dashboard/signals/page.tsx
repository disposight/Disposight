"use client";

import { useEffect, useState } from "react";
import { api, type Signal, type SignalListResponse } from "@/lib/api";
import { SignalCard } from "@/components/dashboard/signal-card";

const SIGNAL_TYPES = [
  "All", "layoff", "bankruptcy_ch7", "bankruptcy_ch11", "merger",
  "office_closure", "plant_closing", "liquidation", "restructuring",
];

export default function SignalsPage() {
  const [data, setData] = useState<SignalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), per_page: "20" };
    if (filter !== "All") params.signal_type = filter;

    api
      .getSignals(params)
      .then(setData)
      .catch(() => setData({ signals: [], total: 0, page: 1, per_page: 20 }))
      .finally(() => setLoading(false));
  }, [filter, page]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Signals
      </h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {SIGNAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setFilter(type); setPage(1); }}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === type ? "var(--accent-muted)" : "var(--bg-surface)",
              color: filter === type ? "var(--accent-text)" : "var(--text-secondary)",
              border: `1px solid ${filter === type ? "var(--accent)" : "var(--border-default)"}`,
            }}
          >
            {type === "All" ? "All Types" : type.replace(/_/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Signal list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-lg animate-pulse"
              style={{ backgroundColor: "var(--bg-surface)" }}
            />
          ))}
        </div>
      ) : data?.signals.length ? (
        <div className="space-y-3">
          {data.signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No signals found
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.per_page && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded text-xs disabled:opacity-30"
            style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)" }}
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {page} / {Math.ceil(data.total / data.per_page)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / data.per_page)}
            className="px-3 py-1.5 rounded text-xs disabled:opacity-30"
            style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
