"use client";

import type { WatchlistItem } from "@/lib/api";

interface TeamLeaderboardProps {
  items: WatchlistItem[];
}

export function TeamLeaderboard({ items }: TeamLeaderboardProps) {
  // Group by claimed_by
  const repMap = new Map<string, { count: number; active: number; won: number; totalScore: number; name: string }>();
  for (const item of items) {
    const key = item.claimed_by || "unassigned";
    const existing = repMap.get(key) || { count: 0, active: 0, won: 0, totalScore: 0, name: item.claimed_by_name || key.slice(0, 8) + "..." };
    existing.count++;
    if (["researching", "contacted", "negotiating"].includes(item.status)) existing.active++;
    if (item.status === "won") existing.won++;
    existing.totalScore += item.composite_risk_score || 0;
    if (item.claimed_by_name) existing.name = item.claimed_by_name;
    repMap.set(key, existing);
  }

  const reps = Array.from(repMap.entries())
    .filter(([key]) => key !== "unassigned")
    .map(([, stats]) => stats)
    .sort((a, b) => b.active - a.active || b.won - a.won);

  if (reps.length === 0) {
    return (
      <div
        className="p-6 rounded-lg text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No active leads yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Team Leaderboard
        </h3>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
        {reps.map((rep, i) => (
          <div key={rep.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: i === 0 ? "var(--accent)" : "var(--bg-elevated)",
                  color: i === 0 ? "#fff" : "var(--text-muted)",
                }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {rep.name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{rep.active} active</span>
              <span style={{ color: rep.won > 0 ? "#10b981" : "var(--text-muted)" }}>{rep.won} won</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
