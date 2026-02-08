import type { Signal } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

const categoryLabels: Record<string, string> = {
  layoff: "LAYOFF",
  shutdown: "SHUTDOWN",
  bankruptcy_ch7: "CH7 BANKRUPT",
  bankruptcy_ch11: "CH11 BANKRUPT",
  merger: "MERGER",
  acquisition: "ACQUISITION",
  office_closure: "CLOSURE",
  plant_closing: "PLANT CLOSE",
  facility_shutdown: "SHUTDOWN",
  relocation: "RELOCATION",
  liquidation: "LIQUIDATION",
  ceasing_operations: "CEASING OPS",
  restructuring: "RESTRUCTURE",
};

export function SignalCard({ signal }: { signal: Signal }) {
  const timeAgo = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true });

  return (
    <div
      className="p-4 rounded-lg transition-colors cursor-pointer"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <span
            className="px-2 py-0.5 rounded text-[11px] font-medium"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            {categoryLabels[signal.signal_type] || signal.signal_type.toUpperCase()}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-medium"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            {signal.source_name}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {timeAgo}
        </span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1 mr-4">
          <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            {signal.company_name || "Unknown Company"}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {signal.summary || signal.title}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-2xl font-mono font-medium"
            style={{ color: scoreColor(signal.severity_score) }}
          >
            {signal.severity_score}
          </span>
          <div
            className="mt-1 h-1 w-12 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-elevated)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${signal.severity_score}%`,
                backgroundColor: scoreColor(signal.severity_score),
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {signal.location_city && (
          <>
            <span>
              {signal.location_city}
              {signal.location_state ? `, ${signal.location_state}` : ""}
            </span>
            <span>·</span>
          </>
        )}
        {signal.affected_employees && (
          <>
            <span>{signal.affected_employees.toLocaleString()} affected</span>
            <span>·</span>
          </>
        )}
        {signal.device_estimate && (
          <>
            <span>~{signal.device_estimate.toLocaleString()} devices</span>
            <span>·</span>
          </>
        )}
        <span>{signal.source_name}</span>
      </div>
    </div>
  );
}
