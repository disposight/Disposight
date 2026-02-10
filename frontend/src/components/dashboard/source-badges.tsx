import { Tooltip } from "@/components/tooltip";

interface SourceBadgesProps {
  sources: string[];
}

const SOURCE_COLORS: Record<string, string> = {
  warn_act: "#3b82f6",    // blue
  gdelt: "#a855f7",       // purple
  sec_edgar: "#f97316",   // orange
  courtlistener: "#ef4444", // red
  globenewswire: "#22c55e", // green
};

const SOURCE_LABELS: Record<string, string> = {
  warn_act: "WARN",
  gdelt: "GDELT",
  sec_edgar: "SEC",
  courtlistener: "Court",
  globenewswire: "GNW",
};

const SOURCE_TIPS: Record<string, string> = {
  warn_act: "WARN Act — Federal layoff notices requiring 60-day advance warning from the Dept. of Labor",
  gdelt: "GDELT — Global news monitoring for closures, shutdowns, and liquidation events",
  sec_edgar: "SEC EDGAR — 8-K filings disclosing M&A, exit activities, and asset impairments",
  courtlistener: "CourtListener — Chapter 7 (liquidation) and Chapter 11 (reorganization) bankruptcy filings",
  globenewswire: "GlobeNewswire — Corporate press releases on restructuring, divestitures, and acquisitions",
};

export function SourceBadges({ sources }: SourceBadgesProps) {
  return (
    <div className="flex gap-1">
      {sources.map((src) => {
        const color = SOURCE_COLORS[src] || "var(--text-muted)";
        const label = SOURCE_LABELS[src] || src.toUpperCase();
        const tip = SOURCE_TIPS[src] || src;
        return (
          <Tooltip key={src} text={tip} position="top">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold cursor-help"
              style={{
                backgroundColor: `${color}20`,
                color,
              }}
            >
              {label}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}
