"use client";

import type { WatchlistItem } from "@/lib/api";
import { useRevenue } from "@/contexts/revenue-context";

interface TeamLeaderboardProps {
  items: WatchlistItem[];
}

interface RepStats {
  name: string;
  claimed: number;
  contacted: number;
  totalScore: number;
}

export function TeamLeaderboard({ items }: TeamLeaderboardProps) {
  const { formatRevenue } = useRevenue();

  // Group by claimed_by
  const repMap = new Map<string, { count: number; contacted: number; totalScore: number }>();
  for (const item of items) {
    const key = item.claimed_by || "unassigned";
    const existing = repMap.get(key) || { count: 0, contacted: 0, totalScore: 0 };
    existing.count++;
    if (item.status === "contacted") existing.contacted++;
    existing.totalScore += item.composite_risk_score || 0;
    repMap.set(key, existing);
  }

  const reps = Array.from(repMap.entries())
    .filter(([key]) => key !== "unassigned")
    .map(([key, stats]) => ({
      name: key.slice(0, 8) + "...",
      claimed: stats.count,
      contacted: stats.contacted,
      totalScore: stats.totalScore,
    }))
    .sort((a, b) => b.claimed - a.claimed);

  if (reps.length === 0) {
    return (
      <div
        className="p-6 rounded-lg text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No claimed leads yet
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
              <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                {rep.name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{rep.claimed} claimed</span>
              <span>{rep.contacted} contacted</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
