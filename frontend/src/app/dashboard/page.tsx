"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  PlanLimitError,
  type CommandCenterStats,
  type OpportunityListResponse,
} from "@/lib/api";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { PricePerDeviceSelector } from "@/components/dashboard/price-per-device-selector";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { UncoveredDeals } from "@/components/dashboard/uncovered-deals";
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

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  layoff: "#ef4444",
  bankruptcy_ch7: "#f97316",
  bankruptcy_ch11: "#f97316",
  merger: "#8b5cf6",
  office_closure: "#eab308",
  plant_closing: "#eab308",
  liquidation: "#dc2626",
  restructuring: "#6366f1",
  ceasing_operations: "#dc2626",
};

function formatValue(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TodayPage() {
  const { isPro, isTrial } = usePlan();
  const [stats, setStats] = useState<CommandCenterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Expanded mode state
  const [data, setData] = useState<OpportunityListResponse | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deal_score");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [watchLimitMsg, setWatchLimitMsg] = useState<string | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    setStatsLoading(true);
    api.getCommandCenterStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  // Fetch full list when expanded or filters change
  useEffect(() => {
    if (!showAll) return;
    setListLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: "20",
      sort_by: sortBy,
    };
    if (filter !== "All") params.signal_type = filter;

    api.getOpportunities(params)
      .then(setData)
      .catch(() => setData({ opportunities: [], total: 0, page: 1, per_page: 20, total_pipeline_value: 0, total_devices: 0 }))
      .finally(() => setListLoading(false));
  }, [showAll, filter, sortBy, page]);

  const handleWatch = async (companyId: string) => {
    setWatchLimitMsg(null);
    try {
      await api.addToWatchlist(companyId);
      // Update in stats top_opportunities
      if (stats) {
        setStats({
          ...stats,
          top_opportunities: stats.top_opportunities.map((o) =>
            o.company_id === companyId ? { ...o, is_watched: true } : o
          ),
        });
      }
      // Update in expanded list
      if (data) {
        setData({
          ...data,
          opportunities: data.opportunities.map((o) =>
            o.company_id === companyId ? { ...o, is_watched: true } : o
          ),
        });
      }
    } catch (err) {
      if (err instanceof PlanLimitError) {
        setWatchLimitMsg(err.message);
      }
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <PlanGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Today&apos;s Actions
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {today}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro && (
              <button
                onClick={async () => {
                  setExporting(true);
                  try { await api.exportOpportunitiesCSV(); } catch { /* noop */ } finally { setExporting(false); }
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

        {/* Stats Strip */}
        {statsLoading ? (
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-5 gap-3">
            <StatCard
              label="Calls to Make"
              value={stats.calls_to_make}
              accent="#ef4444"
            />
            <StatCard
              label="Contacts to Make"
              value={stats.contacts_to_make}
              accent="#f97316"
            />
            <StatCard
              label="New Today"
              value={stats.new_opportunities_today}
              accent="#10b981"
            />
            <StatCard
              label="Pipeline Value"
              value={formatValue(stats.total_pipeline_value)}
              accent="#6366f1"
            />
            <StatCard
              label="Total Devices"
              value={stats.total_devices_in_pipeline.toLocaleString()}
              accent="#8b5cf6"
            />
          </div>
        ) : null}

        {watchLimitMsg && <UpgradePrompt message={watchLimitMsg} />}

        {!showAll && <UncoveredDeals onWatch={handleWatch} />}

        {showAll ? (
          /* ========== EXPANDED: FULL DEALS LIST ========== */
          <>
            {/* Back button + filters */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setShowAll(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                &larr; Back to Action View
              </button>
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

            {/* Filter chips */}
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

            {/* Full opportunity list */}
            {listLoading ? (
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
          </>
        ) : (
          /* ========== ACTION VIEW: TOP 5 + WHAT CHANGED ========== */
          <>
            {/* Priority Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Priority Actions
                </h2>
                <button
                  onClick={() => setShowAll(true)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--accent-text)",
                    border: "1px solid var(--accent)",
                  }}
                >
                  Show All Deals
                </button>
              </div>

              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
                  ))}
                </div>
              ) : stats?.top_opportunities.length ? (
                <div className="space-y-3">
                  {stats.top_opportunities.map((opp) => {
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
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No priority deals right now</p>
                </div>
              )}
            </div>

            {/* What Changed */}
            <div>
              <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                What Changed
              </h2>
              {stats?.recent_changes.length ? (
                <div
                  className="rounded-lg divide-y"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {stats.recent_changes.map((change, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${SIGNAL_TYPE_COLORS[change.signal_type] || "#6b7280"}20`,
                          color: SIGNAL_TYPE_COLORS[change.signal_type] || "#6b7280",
                        }}
                      >
                        {change.signal_type.replace(/_/g, " ")}
                      </span>
                      <Link
                        href={`/dashboard/companies/${change.company_id}`}
                        className="font-medium shrink-0 hover:underline"
                        style={{ color: "var(--accent-text)" }}
                      >
                        {change.company_name}
                      </Link>
                      <span
                        className="truncate flex-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {change.title}
                      </span>
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: "var(--bg-muted)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {change.source_name}
                      </span>
                      <span
                        className="shrink-0 text-xs tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {timeAgo(change.detected_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="p-6 rounded-lg text-center"
                  style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                >
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No new signals in the last 48 hours
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Show All button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowAll(true)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                Show All Deals
              </button>
            </div>
          </>
        )}
      </div>
    </PlanGate>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
      }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-xl font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
