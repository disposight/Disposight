import { Tooltip } from "@/components/tooltip";

interface DispositionBadgeProps {
  window: string;
}

const dispositionTips: Record<string, string> = {
  Immediate: "Assets likely available now — liquidation underway or imminent. Act fast.",
  "2-4 weeks": "Assets expected within 2–4 weeks as disposition process begins.",
  "1-3 months": "Assets likely available in 1–3 months. Good time to establish contact.",
  "3-6 months": "Early stage — assets may become available in 3–6 months. Monitor closely.",
};

function dispositionColor(window: string): string {
  switch (window) {
    case "Immediate":
      return "var(--critical)";
    case "2-4 weeks":
      return "var(--high)";
    case "1-3 months":
      return "var(--medium)";
    case "3-6 months":
    default:
      return "var(--text-muted)";
  }
}

export function DispositionBadge({ window }: DispositionBadgeProps) {
  const color = dispositionColor(window);
  const tip = dispositionTips[window] || "Estimated timeline for when surplus equipment becomes available for recovery";

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
        {window}
      </span>
    </Tooltip>
  );
}
