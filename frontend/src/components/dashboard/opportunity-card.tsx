"use client";

import Link from "next/link";
import type { Opportunity } from "@/lib/api";
import { Tooltip } from "@/components/tooltip";
import { DealScoreBadge } from "./deal-score-badge";
import { DispositionBadge } from "./disposition-badge";
import { TimingBadge } from "./timing-badge";
import { RevenueDisplay } from "./revenue-display";
import { SourceBadges } from "./source-badges";
import { NextActionBar } from "./next-action";

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
  layoff: "Mass layoff — often precedes equipment surplus",
  shutdown: "Facility shutdown — high likelihood of surplus assets",
  bankruptcy_ch7: "Chapter 7 — company liquidating all assets",
  bankruptcy_ch11: "Chapter 11 — reorganizing, may sell non-essential assets",
  merger: "Merger — duplicate equipment from combined companies",
  acquisition: "Acquisition — buyer consolidates, freeing redundant equipment",
  office_closure: "Office closing — IT gear available",
  plant_closing: "Plant closing — large-scale equipment decommissioned",
  facility_shutdown: "Facility shutdown — large asset disposition expected",
  relocation: "Relocation — old equipment often not transferred",
  liquidation: "Full liquidation — all assets being sold off",
  ceasing_operations: "Ceasing operations — all assets must go",
  restructuring: "Restructuring — divisions closing, assets redistributed",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onWatch?: (companyId: string) => void;
  onClaim?: (companyId: string) => void;
  compact?: boolean;
  gated?: boolean;
}

export function OpportunityCard({
  opportunity: opp,
  onWatch,
  onClaim,
  compact = false,
  gated = false,
}: OpportunityCardProps) {
  const cardHref = gated ? "/dashboard/settings" : `/dashboard/opportunities/${opp.company_id}`;

  return (
    <Link href={cardHref} title={gated ? "Upgrade to view this deal" : undefined}>
      <div
        className="p-4 rounded-lg transition-colors cursor-pointer hover:border-[var(--accent)] relative"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-start gap-4">
          {/* Deal Score — visually dominant */}
          <div className="shrink-0">
            <DealScoreBadge
              score={opp.deal_score}
              bandLabel={opp.score_band_label}
              size={compact ? "sm" : "md"}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div>
                <h3
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {gated ? (
                    <span className="inline-flex items-center gap-2">
                      <span style={{ filter: "blur(6px)", userSelect: "none" }} aria-hidden="true">
                        {opp.company_name}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)", filter: "none" }}
                      >
                        Upgrade
                      </span>
                    </span>
                  ) : (
                    <>
                      {opp.company_name}
                      {opp.ticker && (
                        <span
                          className="ml-2 text-xs font-mono font-normal"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {opp.ticker}
                        </span>
                      )}
                    </>
                  )}
                </h3>
                <div className="flex items-center gap-2 mt-0.5" style={gated ? { filter: "blur(4px)", userSelect: "none" } : undefined}>
                  {opp.industry && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {opp.industry}
                    </span>
                  )}
                  {opp.headquarters_state && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {opp.headquarters_state}
                    </span>
                  )}
                  {opp.latest_signal_at && (
                    <>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Detected {timeAgo(opp.latest_signal_at)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <DispositionBadge window={opp.disposition_window} />
              {opp.predicted_phase && (
                <TimingBadge
                  phase={opp.predicted_phase}
                  phaseLabel={opp.predicted_phase_label}
                  verb={opp.phase_verb}
                  compact
                />
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2">
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Devices
                </span>
                <p
                  className="text-sm font-mono font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {opp.total_device_estimate.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Revenue
                </span>
                <p>
                  <RevenueDisplay deviceCount={opp.total_device_estimate} size="sm" />
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Signals
                </span>
                <p
                  className="text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {opp.signal_count}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Risk
                </span>
                <p
                  className="text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {opp.composite_risk_score}
                </p>
              </div>
            </div>

            {/* Deal justification prose */}
            {!compact && opp.justification && (
              <p
                className="mt-2 text-[11px] leading-relaxed line-clamp-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {opp.justification}
              </p>
            )}

            {/* Badges row */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {opp.signal_types.slice(0, 3).map((t) => (
                    <Tooltip key={t} text={categoryTips[t] || t} position="top">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium cursor-help"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {categoryLabels[t] || t.toUpperCase()}
                      </span>
                    </Tooltip>
                  ))}
                </div>
                <SourceBadges sources={opp.source_names} />
                {opp.has_contacts && opp.contact_count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--accent)" }}
                  >
                    {opp.contact_count} Contact{opp.contact_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Actions */}
              {(onWatch || onClaim) && (
                <div
                  className="flex gap-2"
                  onClick={(e) => e.preventDefault()}
                >
                  {onWatch && !opp.is_watched && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onWatch(opp.company_id);
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      Watch
                    </button>
                  )}
                  {opp.is_watched && (
                    <span
                      className="px-2.5 py-1 rounded text-[11px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      Watching
                    </span>
                  )}
                  {onClaim && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaim(opp.company_id);
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "#fff",
                      }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Next Action */}
            {!compact && <NextActionBar opportunity={opp} />}
          </div>
        </div>
      </div>
    </Link>
  );
}
