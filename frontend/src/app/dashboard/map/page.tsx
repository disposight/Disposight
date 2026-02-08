"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api, type Signal, type SignalListResponse } from "@/lib/api";

const SignalMap = dynamic(
  () => import("@/components/dashboard/signal-map"),
  { ssr: false }
);

const SIGNAL_TYPES = [
  "All",
  "layoff",
  "facility_shutdown",
  "bankruptcy_ch11",
  "merger",
  "office_closure",
  "restructuring",
];

export default function MapPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [stats, setStats] = useState({ total: 0, mapped: 0 });

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { per_page: "200" };
    if (filter !== "All") params.signal_type = filter;

    api
      .getSignals(params)
      .then((data: SignalListResponse) => {
        setSignals(data.signals);
        const mapped = data.signals.filter(
          (s) => s.location_city || s.location_state
        ).length;
        setStats({ total: data.total, mapped });
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const geoSignals = signals.filter(
    (s) => s.location_city || s.location_state
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Signal Map
        </h1>
        <div
          className="text-xs font-mono px-3 py-1.5 rounded"
          style={{
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-muted)",
            border: "1px solid var(--border-default)",
          }}
        >
          {stats.mapped} / {stats.total} signals mapped
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {SIGNAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                filter === type ? "var(--accent-muted)" : "var(--bg-surface)",
              color:
                filter === type
                  ? "var(--accent-text)"
                  : "var(--text-secondary)",
              border: `1px solid ${filter === type ? "var(--accent)" : "var(--border-default)"}`,
            }}
          >
            {type === "All"
              ? "All Types"
              : type.replace(/_/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Map */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          height: "calc(100vh - 14rem)",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-pulse text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Loading signals...
            </div>
          </div>
        ) : geoSignals.length > 0 ? (
          <SignalMap signals={geoSignals} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No signals with location data
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="font-medium">Severity:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          Low (1-3)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#eab308" }} />
          Medium (4-5)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f97316" }} />
          High (6-7)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          Critical (8-10)
        </span>
      </div>
    </div>
  );
}
