import type { Signal } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Tooltip } from "@/components/tooltip";

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

const categoryTips: Record<string, string> = {
  layoff: "Mass layoff event — company reducing workforce, often precedes equipment surplus",
  shutdown: "Facility shutdown — entire location closing, high likelihood of surplus assets",
  bankruptcy_ch7: "Chapter 7 bankruptcy — company liquidating all assets. Equipment must be sold.",
  bankruptcy_ch11: "Chapter 11 bankruptcy — company reorganizing. May sell non-essential assets.",
  merger: "Merger — combining companies often produces duplicate equipment and facilities",
  acquisition: "Acquisition — buyer often consolidates operations, freeing up redundant equipment",
  office_closure: "Office closure — location shutting down. Desks, servers, and IT gear available.",
  plant_closing: "Plant/factory closing — large-scale equipment and IT infrastructure being decommissioned",
  facility_shutdown: "Facility shutdown — building or campus closing, large asset disposition expected",
  relocation: "Company relocation — moving to new site. Old equipment often not transferred.",
  liquidation: "Full liquidation — all company assets being sold off. Maximum surplus potential.",
  ceasing_operations: "Ceasing operations — company winding down entirely. All assets must go.",
  restructuring: "Restructuring — major reorganization. Divisions closing and assets being redistributed.",
};

export function SignalCard({ signal }: { signal: Signal }) {
  const timeAgo = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true });
  const signalType = signal.signal_type;

  return (
    <Link href={`/dashboard/opportunities/${signal.company_id}/signals/${signal.id}`}>
    <div
      className="p-4 rounded-lg transition-colors cursor-pointer hover:border-[var(--accent)]"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <Tooltip text={categoryTips[signalType] || signalType} position="bottom">
            <span
              className="px-2 py-0.5 rounded text-[11px] font-medium cursor-help"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {categoryLabels[signalType] || signalType.toUpperCase()}
            </span>
          </Tooltip>
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
        <Tooltip text="Severity score (0–100) — based on signal type, affected employees, and likelihood of producing surplus IT equipment" position="left">
          <div className="text-right shrink-0 cursor-help">
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
        </Tooltip>
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
    </Link>
  );
}
