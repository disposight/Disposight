"use client";

import { useEffect, useState } from "react";
import { api, type CommandCenterStats } from "@/lib/api";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { PricePerDeviceSelector } from "@/components/dashboard/price-per-device-selector";
import { PlanGate } from "@/components/dashboard/plan-gate";

function StatCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div
      className="p-5 rounded-lg"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-mono font-bold mt-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
          {subValue}
        </p>
      )}
    </div>
  );
}

function formatPipelineValue(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<CommandCenterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCommandCenterStats()
      .then(setStats)
      .catch(() => {
        setStats({
          total_pipeline_value: 0,
          pipeline_value_change_7d: 0,
          new_opportunities_today: 0,
          hot_opportunities: 0,
          total_active_opportunities: 0,
          total_devices_in_pipeline: 0,
          watchlist_count: 0,
          top_opportunities: [],
          calls_to_make: 0,
          contacts_to_make: 0,
          recent_changes: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PlanGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Overview
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Your revenue pipeline at a glance
            </p>
          </div>
          <PricePerDeviceSelector />
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Pipeline Value"
            value={formatPipelineValue(stats?.total_pipeline_value || 0)}
            subValue={stats?.pipeline_value_change_7d ? `+${formatPipelineValue(stats.pipeline_value_change_7d)} this week` : undefined}
          />
          <StatCard
            label="Hot Deals"
            value={String(stats?.hot_opportunities || 0)}
            subValue={`${stats?.total_active_opportunities || 0} total active`}
          />
          <StatCard
            label="Total Devices"
            value={(stats?.total_devices_in_pipeline || 0).toLocaleString()}
            subValue={`${stats?.watchlist_count || 0} on watchlist`}
          />
        </div>

        {/* Pipeline Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>New Today</p>
            <p className="text-lg font-mono font-bold" style={{ color: "var(--text-primary)" }}>
              {stats?.new_opportunities_today || 0}
            </p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Active</p>
            <p className="text-lg font-mono font-bold" style={{ color: "var(--text-primary)" }}>
              {stats?.total_active_opportunities || 0}
            </p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--critical)" }}>Hot</p>
            <p className="text-lg font-mono font-bold" style={{ color: "var(--critical)" }}>
              {stats?.hot_opportunities || 0}
            </p>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Watchlist</p>
            <p className="text-lg font-mono font-bold" style={{ color: "var(--text-primary)" }}>
              {stats?.watchlist_count || 0}
            </p>
          </div>
        </div>

        {/* Top Deals */}
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Top Deals
          </h2>
          {stats?.top_opportunities.length ? (
            <div className="space-y-3">
              {stats.top_opportunities.map((opp) => (
                <OpportunityCard key={opp.company_id} opportunity={opp} />
              ))}
            </div>
          ) : (
            <div
              className="p-8 rounded-lg text-center"
              style={{ backgroundColor: "var(--bg-surface)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No deals detected yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Deals will appear as our 4 data pipelines ingest signals
              </p>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  );
}
