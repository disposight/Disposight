"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type WatchlistItem } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/contexts/plan-context";
import { TeamLeaderboard } from "@/components/dashboard/team-leaderboard";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

const STATUS_ORDER = ["claimed", "contacted", "watching", "passed"];
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

export default function PipelinePage() {
  const { user } = usePlan();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const [view, setView] = useState<"mine" | "team">(isManager ? "team" : "mine");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = view === "team" ? api.getTeamPipeline() : api.getMyPipeline();
    fetcher
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [view]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updated = await api.updateLeadStatus(id, newStatus);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch {}
  };

  // Group by status
  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = items.filter((item) => (item.status || "watching") === status);
      return acc;
    },
    {} as Record<string, WatchlistItem[]>
  );

  return (
    <PlanGate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {view === "team" ? "Team Pipeline" : "My Pipeline"}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {items.length} leads in pipeline
            </p>
          </div>
          {isManager && (
            <div className="flex gap-1 rounded-md overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
              <button
                onClick={() => setView("mine")}
                className="px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: view === "mine" ? "var(--accent-muted)" : "var(--bg-surface)",
                  color: view === "mine" ? "var(--accent-text)" : "var(--text-secondary)",
                }}
              >
                My Leads
              </button>
              <button
                onClick={() => setView("team")}
                className="px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: view === "team" ? "var(--accent-muted)" : "var(--bg-surface)",
                  color: view === "team" ? "var(--accent-text)" : "var(--text-secondary)",
                }}
              >
                Team View
              </button>
            </div>
          )}
        </div>

        {/* Team leaderboard (manager only) */}
        {view === "team" && isManager && items.length > 0 && (
          <TeamLeaderboard items={items} />
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No leads in your pipeline yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Claim leads from the{" "}
              <Link href="/dashboard" className="hover:underline" style={{ color: "var(--accent)" }}>
                Deals
              </Link>
              {" "}page to start building your pipeline
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {STATUS_ORDER.map((status) => {
              const group = grouped[status];
              if (!group || group.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: STATUS_COLORS[status] }}>
                    {STATUS_LABELS[status]} ({group.length})
                  </h3>
                  <div className="space-y-2">
                    {group.map((item) => (
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
                        <div className="flex items-center gap-2">
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
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlanGate>
  );
}
