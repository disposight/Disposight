"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api, type Opportunity, type OpportunityListResponse } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { useRevenue } from "@/contexts/revenue-context";
import { DealScoreBadge, dealScoreConfig } from "@/components/dashboard/deal-score-badge";

const OpportunityMap = dynamic(
  () => import("@/components/dashboard/signal-map").then((mod) => {
    // Wrap the existing SignalMap to accept opportunities
    return { default: mod.default };
  }),
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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const { formatRevenue } = useRevenue();

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { per_page: "200" };
    if (filter !== "All") params.signal_type = filter;

    api
      .getOpportunities(params)
      .then((data) => setOpportunities(data.opportunities))
      .catch(() => setOpportunities([]))
      .finally(() => setLoading(false));
  }, [filter]);

  // Convert opportunities to signal-like objects for the existing map component
  const mapSignals = opportunities
    .filter((o) => o.headquarters_state)
    .map((o) => ({
      id: o.company_id,
      company_id: o.company_id,
      signal_type: o.signal_types[0] || "unknown",
      signal_category: o.signal_types[0] || "unknown",
      title: o.company_name,
      summary: null,
      confidence_score: o.deal_score,
      severity_score: Math.round(o.deal_score / 10),
      source_name: o.source_names[0] || "",
      source_url: null,
      source_published_at: null,
      location_city: null,
      location_state: o.headquarters_state,
      affected_employees: o.employee_count,
      device_estimate: o.total_device_estimate,
      correlation_group_id: null,
      created_at: o.latest_signal_at,
      company_name: o.company_name,
    }));

  return (
    <PlanGate>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Deal Map
          </h1>
          <div
            className="text-xs font-mono px-3 py-1.5 rounded"
            style={{
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-default)",
            }}
          >
            {opportunities.length} deals mapped
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
                backgroundColor: filter === type ? "var(--accent-muted)" : "var(--bg-surface)",
                color: filter === type ? "var(--accent-text)" : "var(--text-secondary)",
                border: `1px solid ${filter === type ? "var(--accent)" : "var(--border-default)"}`,
              }}
            >
              {type === "All" ? "All Types" : type.replace(/_/g, " ").toUpperCase()}
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
              <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>
                Loading deals...
              </div>
            </div>
          ) : mapSignals.length > 0 ? (
            <OpportunityMap signals={mapSignals} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No deals with location data
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium">Deal Score:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
            Low (1-39)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#eab308" }} />
            Moderate (40-59)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f97316" }} />
            Warm (60-79)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            Hot (80-100)
          </span>
        </div>
      </div>
    </PlanGate>
  );
}
