interface DispositionBadgeProps {
  window: string;
}

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

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
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
  );
}
