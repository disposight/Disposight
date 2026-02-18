"use client";

interface FollowUpIndicatorProps {
  followUpAt: string | null;
  compact?: boolean;
}

export function FollowUpIndicator({ followUpAt, compact }: FollowUpIndicatorProps) {
  if (!followUpAt) return null;

  const now = new Date();
  const fuDate = new Date(followUpAt);
  const diffMs = fuDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86_400_000);

  let color: string;
  let label: string;

  if (diffDays < 0) {
    color = "var(--critical)";
    label = compact ? `${Math.abs(diffDays)}d overdue` : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`;
  } else if (diffDays === 0) {
    color = "var(--high)";
    label = "Today";
  } else {
    color = "var(--text-muted)";
    label = compact ? `in ${diffDays}d` : `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  }

  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: diffDays < 0 ? `${color}15` : "var(--bg-elevated)",
      }}
    >
      {label}
    </span>
  );
}
