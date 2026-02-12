"use client";

import { useEffect, useState } from "react";
import { api, PlanLimitError, type OpportunityListResponse } from "@/lib/api";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { PricePerDeviceSelector } from "@/components/dashboard/price-per-device-selector";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { usePlan } from "@/contexts/plan-context";

const SIGNAL_TYPES = [
  "All", "layoff", "bankruptcy_ch7", "bankruptcy_ch11", "merger",
  "office_closure", "plant_closing", "liquidation", "restructuring",
];

const SORT_OPTIONS = [
  { value: "deal_score", label: "Deal Score" },
  { value: "revenue", label: "Revenue" },
  { value: "devices", label: "Devices" },
  { value: "recency", label: "Most Recent" },
];

function formatValue(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function DealsPage() {
  const { isPro, isTrial } = usePlan();
  const [data, setData] = useState<OpportunityListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deal_score");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: "20",
      sort_by: sortBy,
    };
    if (filter !== "All") params.signal_type = filter;

    api
      .getOpportunities(params)
      .then(setData)
      .catch(() => setData({ opportunities: [], total: 0, page: 1, per_page: 20, total_pipeline_value: 0, total_devices: 0 }))
      .finally(() => setLoading(false));
  }, [filter, sortBy, page]);

  const [watchLimitMsg, setWatchLimitMsg] = useState<string | null>(null);

  const handleWatch = async (companyId: string) => {
    setWatchLimitMsg(null);
    try {
      await api.addToWatchlist(companyId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              opportunities: prev.opportunities.map((o) =>
                o.company_id === companyId ? { ...o, is_watched: true } : o
              ),
            }
          : prev
      );
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setWatchLimitMsg(err.message);
      }
    }
  };

  return (
    <PlanGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Deals
            </h1>
            {data && (
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {data.total} deals | {formatValue(data.total_pipeline_value)} pipeline | {data.total_devices.toLocaleString()} devices
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isPro && (
              <button
                onClick={async () => {
                  setExporting(true);
                  try { await api.exportOpportunitiesCSV(); } catch {} finally { setExporting(false); }
                }}
                disabled={exporting}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            )}
            <PricePerDeviceSelector />
          </div>
        </div>

        {/* Filter + Sort bar */}
        <div className="flex items-center justify-between gap-4">
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
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-md text-xs outline-none"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>

        {watchLimitMsg && <UpgradePrompt message={watchLimitMsg} />}

        {/* Opportunity list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
            ))}
          </div>
        ) : data?.opportunities.length ? (
          <div className="space-y-3">
            {data.opportunities.map((opp) => {
              const ageMs = Date.now() - new Date(opp.latest_signal_at).getTime();
              const isHotDeal = opp.deal_score >= 70 && ageMs < 7 * 86_400_000;
              const isFresh = ageMs < 5 * 86_400_000;
              return (
                <OpportunityCard
                  key={opp.company_id}
                  opportunity={opp}
                  onWatch={handleWatch}
                  gated={isTrial && (isHotDeal || isFresh)}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No deals found</p>
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
    </PlanGate>
  );
}
