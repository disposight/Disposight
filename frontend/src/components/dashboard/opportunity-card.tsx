"use client";

import Link from "next/link";
import type { Opportunity } from "@/lib/api";
import { Tooltip } from "@/components/tooltip";
import { DealScoreBadge } from "./deal-score-badge";
import { DispositionBadge } from "./disposition-badge";
import { RevenueDisplay } from "./revenue-display";
import { SourceBadges } from "./source-badges";
import { NextActionBar } from "./next-action";
import { CompactScoreBreakdown } from "./score-breakdown";

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

interface OpportunityCardProps {
  opportunity: Opportunity;
  onWatch?: (companyId: string) => void;
  onClaim?: (companyId: string) => void;
  compact?: boolean;
}

export function OpportunityCard({
  opportunity: opp,
  onWatch,
  onClaim,
  compact = false,
}: OpportunityCardProps) {
  return (
    <Link href={`/dashboard/opportunities/${opp.company_id}`}>
      <div
        className="p-4 rounded-lg transition-colors cursor-pointer hover:border-[var(--accent)]"
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
                  {opp.company_name}
                  {opp.ticker && (
                    <span
                      className="ml-2 text-xs font-mono font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {opp.ticker}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
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
                </div>
              </div>
              <DispositionBadge window={opp.disposition_window} />
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

            {/* Top factors — compact score breakdown */}
            {!compact && opp.top_factors && opp.top_factors.length > 0 && (
              <CompactScoreBreakdown topFactors={opp.top_factors} />
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
