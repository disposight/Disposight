import type { ScoreBreakdown as ScoreBreakdownType } from "@/lib/api";

interface CompactScoreBreakdownProps {
  topFactors: string[];
}

export function CompactScoreBreakdown({ topFactors }: CompactScoreBreakdownProps) {
  if (!topFactors || topFactors.length === 0) return null;

  return (
    <div className="mt-2 space-y-0.5">
      {topFactors.map((factor, i) => (
        <p
          key={i}
          className="text-[11px] leading-tight truncate"
          style={{ color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--accent)" }}>&#8226;</span> {factor}
        </p>
      ))}
    </div>
  );
}

interface FullScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

export function FullScoreBreakdown({ breakdown }: FullScoreBreakdownProps) {
  return (
    <div
      className="p-6 rounded-lg"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Score Breakdown
        </h2>
        <div className="flex gap-2">
          {breakdown.boost_applied && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: "var(--accent)",
                color: "#fff",
              }}
            >
              HIGH-TRUST BOOST +3
            </span>
          )}
          {breakdown.penalty_applied && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: "var(--critical)",
                color: "#fff",
              }}
            >
              LOW-CONFIDENCE PENALTY -15
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {breakdown.factors.map((factor) => {
          const pct = factor.max_points > 0
            ? Math.round((factor.points / factor.max_points) * 100)
            : 0;
          const barColor =
            pct >= 80 ? "var(--accent)" :
            pct >= 50 ? "var(--high)" :
            pct >= 25 ? "var(--medium)" :
            "var(--low)";

          return (
            <div key={factor.name}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {factor.name}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {factor.points}/{factor.max_points}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--bg-elevated)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] shrink-0 max-w-[260px] truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {factor.summary}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
