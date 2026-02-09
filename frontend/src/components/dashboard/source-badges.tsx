interface SourceBadgesProps {
  sources: string[];
}

const SOURCE_COLORS: Record<string, string> = {
  warn_act: "#3b82f6",    // blue
  gdelt: "#a855f7",       // purple
  sec_edgar: "#f97316",   // orange
  courtlistener: "#ef4444", // red
};

const SOURCE_LABELS: Record<string, string> = {
  warn_act: "WARN",
  gdelt: "GDELT",
  sec_edgar: "SEC",
  courtlistener: "Court",
};

export function SourceBadges({ sources }: SourceBadgesProps) {
  return (
    <div className="flex gap-1">
      {sources.map((src) => {
        const color = SOURCE_COLORS[src] || "var(--text-muted)";
        const label = SOURCE_LABELS[src] || src.toUpperCase();
        return (
          <span
            key={src}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              backgroundColor: `${color}20`,
              color,
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
