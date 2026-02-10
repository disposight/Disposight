import { Tooltip } from "@/components/tooltip";

interface DealScoreBadgeProps {
  score: number;
  bandLabel?: string;
  size?: "sm" | "md" | "lg";
}

function dealScoreConfig(score: number): { label: string; color: string; tip: string } {
  if (score >= 85) return { label: "Immediate Pursuit", color: "var(--critical)", tip: "Score 85+ — Highest priority. Strong signals indicate imminent asset disposition." };
  if (score >= 70) return { label: "High Priority", color: "var(--high)", tip: "Score 70–84 — Multiple confirmed signals. Likely to produce surplus equipment soon." };
  if (score >= 55) return { label: "Qualified Pipeline", color: "var(--medium)", tip: "Score 55–69 — Promising signals but needs more confirmation before outreach." };
  return { label: "Background", color: "var(--low)", tip: "Score 0–54 — Early signals detected. Monitor for escalation." };
}

const sizes = {
  sm: { circle: "w-10 h-10", text: "text-sm", label: "text-[10px]" },
  md: { circle: "w-14 h-14", text: "text-lg", label: "text-[11px]" },
  lg: { circle: "w-20 h-20", text: "text-2xl", label: "text-xs" },
};

export function DealScoreBadge({ score, bandLabel, size = "md" }: DealScoreBadgeProps) {
  const config = dealScoreConfig(score);
  const label = bandLabel || config.label;
  const { color, tip } = config;
  const s = sizes[size];

  return (
    <Tooltip text={tip} position="right">
      <div className="flex items-center gap-3 cursor-help">
        <div
          className={`${s.circle} rounded-full flex items-center justify-center shrink-0`}
          style={{ border: `3px solid ${color}` }}
        >
          <span className={`${s.text} font-mono font-bold`} style={{ color }}>
            {score}
          </span>
        </div>
        <div>
          <p className={`${s.label} font-semibold`} style={{ color }}>
            {label}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Deal Score
          </p>
        </div>
      </div>
    </Tooltip>
  );
}

export { dealScoreConfig };
