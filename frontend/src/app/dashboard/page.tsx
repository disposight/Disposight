"use client";

import { useEffect, useState } from "react";
import { api, type DashboardResponse } from "@/lib/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { SignalCard } from "@/components/dashboard/signal-card";
import { PlanGate } from "@/components/dashboard/plan-gate";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(setData)
      .catch(() => {
        // Use placeholder data when API is unavailable
        setData({
          stats: { signals_today: 0, high_risk_companies: 0, watchlist_count: 0, active_alerts: 0 },
          recent_signals: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ backgroundColor: "var(--bg-surface)" }}
            />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg animate-pulse"
              style={{ backgroundColor: "var(--bg-surface)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <PlanGate>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="New Today" value={stats?.signals_today ?? 0} />
          <StatCard label="High Risk" value={stats?.high_risk_companies ?? 0} />
          <StatCard label="Watchlist" value={stats?.watchlist_count ?? 0} />
          <StatCard label="Active Alerts" value={stats?.active_alerts ?? 0} />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Recent Signals
          </h2>
          {data?.recent_signals.length ? (
            <div className="space-y-3">
              {data.recent_signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div
              className="p-8 rounded-lg text-center"
              style={{ backgroundColor: "var(--bg-surface)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No signals detected yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Signals will appear here as our collectors scan data sources
              </p>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  );
}
