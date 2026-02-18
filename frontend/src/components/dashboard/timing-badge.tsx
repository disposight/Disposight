import { Tooltip } from "@/components/tooltip";

interface TimingBadgeProps {
  phase: string;
  phaseLabel: string;
  verb: string;
  compact?: boolean;
}

const phaseTips: Record<string, string> = {
  early_outreach:
    "Distress detected but assets not yet moving. Build relationships ahead of competition.",
  active_liquidation:
    "Assets are or will soon be in play. Peak action window — act now.",
  late_stage:
    "Opportunity aging out. Most value may already be claimed.",
};

function phaseColor(phase: string): string {
  switch (phase) {
    case "active_liquidation":
      return "var(--critical)";
    case "early_outreach":
      return "var(--accent)";
    case "late_stage":
    default:
      return "var(--text-muted)";
  }
}

export function TimingBadge({ phase, phaseLabel, verb, compact = false }: TimingBadgeProps) {
  const color = phaseColor(phase);
  const tip = phaseTips[phase] || "Predicted disposition timing phase";
  const label = compact ? verb : phaseLabel;

  return (
    <Tooltip text={tip} position="left">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium cursor-help"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color,
          border: `1px solid ${color}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
    </Tooltip>
  );
}
