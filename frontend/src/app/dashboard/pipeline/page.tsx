"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, PlanLimitError, type WatchlistItem, type PipelineSummary } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { UpgradePrompt } from "@/components/dashboard/upgrade-prompt";
import { usePlan } from "@/contexts/plan-context";
import { TeamLeaderboard } from "@/components/dashboard/team-leaderboard";
import { FollowUpIndicator } from "@/components/dashboard/follow-up-indicator";
import { DealScoreBadge } from "@/components/dashboard/deal-score-badge";

const PIPELINE_STAGES = [
  { key: "identified", label: "Identified", color: "var(--text-muted)" },
  { key: "researching", label: "Researching", color: "var(--accent)" },
  { key: "contacted", label: "Contacted", color: "var(--high)" },
  { key: "negotiating", label: "Negotiating", color: "var(--medium)" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "var(--critical)" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--text-muted)",
};

const LOST_REASONS = [
  "No asset opportunity",
  "Competitor won",
  "Timing not right",
  "No response",
  "Deal too small",
  "Other",
];

export default function PipelinePage() {
  const { user, isPro } = usePlan();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const canViewTeam = isManager && isPro;
  const [view, setView] = useState<"mine" | "team">(canViewTeam ? "team" : "mine");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamGateMsg, setTeamGateMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [lostModalId, setLostModalId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setTeamGateMsg(null);
    const fetcher = view === "team" ? api.getTeamPipeline() : api.getMyPipeline();
    fetcher
      .then(setItems)
      .catch((err) => {
        if (err instanceof PlanLimitError) {
          setTeamGateMsg(err.message);
          setView("mine");
        }
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => {
    api.getPipelineSummary().then(setSummary).catch(() => {});
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "lost") {
      setLostModalId(id);
      return;
    }
    try {
      const updated = await api.updateLeadStatus(id, newStatus);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch {}
  };

  const handleLostConfirm = async (reason: string) => {
    if (!lostModalId) return;
    try {
      const updated = await api.updateLeadStatus(lostModalId, "lost", reason);
      setItems((prev) => prev.map((item) => (item.id === lostModalId ? updated : item)));
    } catch {}
    setLostModalId(null);
  };

  // Group by status
  const grouped: Record<string, WatchlistItem[]> = {};
  for (const stage of PIPELINE_STAGES) {
    grouped[stage.key] = items.filter((item) => (item.status || "identified") === stage.key);
  }

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
                onClick={() => isPro ? setView("team") : setTeamGateMsg("Team Pipeline requires the Professional plan.")}
                className="px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: view === "team" ? "var(--accent-muted)" : "var(--bg-surface)",
                  color: view === "team" ? "var(--accent-text)" : "var(--text-secondary)",
                  opacity: isPro ? 1 : 0.6,
                }}
              >
                Team View{!isPro ? " (Pro)" : ""}
              </button>
            </div>
          )}
        </div>

        {teamGateMsg && <UpgradePrompt message={teamGateMsg} />}

        {/* Summary bar */}
        {summary && (
          <div className="flex gap-4 flex-wrap">
            <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
              <span style={{ color: "var(--text-muted)" }}>Total: </span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{summary.total}</span>
            </div>
            {summary.overdue_follow_ups > 0 && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--critical)15", border: "1px solid var(--critical)" }}>
                <span style={{ color: "var(--critical)" }}>
                  {summary.overdue_follow_ups} overdue follow-up{summary.overdue_follow_ups !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {summary.won_this_month > 0 && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "#10b98115", border: "1px solid #10b981" }}>
                <span style={{ color: "#10b981" }}>{summary.won_this_month} won this month</span>
              </div>
            )}
            {summary.lost_this_month > 0 && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                <span style={{ color: "var(--text-muted)" }}>{summary.lost_this_month} lost this month</span>
              </div>
            )}
          </div>
        )}

        {/* Team leaderboard (manager only) */}
        {view === "team" && isManager && items.length > 0 && (
          <TeamLeaderboard items={items} />
        )}

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[240px] h-48 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
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
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageItems = grouped[stage.key] || [];
              return (
                <div
                  key={stage.key}
                  className="min-w-[240px] flex-shrink-0 rounded-lg flex flex-col"
                  style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                >
                  {/* Column header */}
                  <div
                    className="px-3 py-2 rounded-t-lg"
                    style={{ borderBottom: "1px solid var(--border-default)", borderTop: `3px solid ${stage.color}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: stage.color }}>
                        {stage.label}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
                      >
                        {stageItems.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                    {stageItems.length === 0 ? (
                      <div className="p-3 text-center">
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>No items</p>
                      </div>
                    ) : (
                      stageItems.map((item) => (
                        <PipelineCard
                          key={item.id}
                          item={item}
                          stageColor={stage.color}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lost reason modal */}
        {lostModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="rounded-lg p-6 w-80 space-y-3" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Why are you marking this as lost?
              </h3>
              <div className="space-y-2">
                {LOST_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleLostConfirm(reason)}
                    className="w-full text-left px-3 py-2 rounded text-xs hover:opacity-80"
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setLostModalId(null)}
                className="w-full text-center text-xs py-2"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PlanGate>
  );
}

function PipelineCard({
  item,
  stageColor,
  onStatusChange,
}: {
  item: WatchlistItem;
  stageColor: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const lastActivityAge = item.last_activity_at
    ? (() => {
        const diff = Date.now() - new Date(item.last_activity_at).getTime();
        const days = Math.floor(diff / 86_400_000);
        if (days === 0) return "today";
        if (days === 1) return "1d ago";
        return `${days}d ago`;
      })()
    : null;

  return (
    <div
      className="p-3 rounded-md space-y-2"
      style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
    >
      {/* Company name + score */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/opportunities/${item.company_id}`}
          className="text-xs font-medium hover:underline leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {item.company_name || "Unknown"}
        </Link>
        {item.deal_score != null && (
          <DealScoreBadge score={item.deal_score} size="sm" />
        )}
      </div>

      {/* Priority dot + follow-up indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[item.priority] || "var(--text-muted)" }}
          title={`Priority: ${item.priority}`}
        />
        <FollowUpIndicator followUpAt={item.follow_up_at} compact />
        {lastActivityAge && (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {lastActivityAge}
          </span>
        )}
        {item.activity_count > 0 && (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {item.activity_count} act.
          </span>
        )}
      </div>

      {/* Claimed by */}
      {item.claimed_by_name && (
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {item.claimed_by_name}
        </p>
      )}

      {/* Status selector */}
      <select
        value={item.status || "identified"}
        onChange={(e) => onStatusChange(item.id, e.target.value)}
        className="w-full px-2 py-1 rounded text-[11px] outline-none"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          color: stageColor,
        }}
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
