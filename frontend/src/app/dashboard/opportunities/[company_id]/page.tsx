"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type OpportunityDetail } from "@/lib/api";
import { DealScoreBadge } from "@/components/dashboard/deal-score-badge";
import { DispositionBadge } from "@/components/dashboard/disposition-badge";
import { RevenueDisplay } from "@/components/dashboard/revenue-display";
import { SourceBadges } from "@/components/dashboard/source-badges";
import { SignalCard } from "@/components/dashboard/signal-card";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { getNextAction } from "@/components/dashboard/next-action";
import { FullScoreBreakdown } from "@/components/dashboard/score-breakdown";
import KineticDotsLoader from "@/components/ui/kinetic-dots-loader";

export default function OpportunityDetailPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchError, setWatchError] = useState("");

  useEffect(() => {
    api
      .getOpportunity(companyId)
      .then(setOpp)
      .catch(() => setOpp(null))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleWatch = async () => {
    setWatchLoading(true);
    setWatchError("");
    try {
      await api.addToWatchlist(companyId);
      setOpp((prev) => (prev ? { ...prev, is_watched: true } : prev));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add to watchlist";
      if (msg.includes("Already in watchlist") || msg.includes("409")) {
        setOpp((prev) => (prev ? { ...prev, is_watched: true } : prev));
      } else {
        setWatchError(msg);
      }
    } finally {
      setWatchLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)", minHeight: "300px" }}
      >
        <KineticDotsLoader label="Loading deal intelligence" />
      </div>
    );
  }

  if (!opp) {
    return <p style={{ color: "var(--text-muted)" }}>Deal not found</p>;
  }

  return (
    <PlanGate>
      <div className="space-y-6 max-w-4xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; Back to Deals
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {opp.company_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {opp.ticker && (
                <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                  {opp.ticker}
                </span>
              )}
              {opp.industry && (
                <span
                  className="px-2 py-0.5 rounded text-[11px]"
                  style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                >
                  {opp.industry}
                </span>
              )}
              {opp.headquarters_state && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {opp.headquarters_state}
                </span>
              )}
              <DispositionBadge window={opp.disposition_window} />
            </div>
          </div>
          <DealScoreBadge
            score={opp.deal_score}
            bandLabel={opp.score_band_label}
            size="lg"
          />
        </div>

        {/* Next Action — prominent on detail page */}
        {(() => {
          const action = getNextAction(opp);
          return (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${action.urgencyColor}40` }}
            >
              <span
                className="shrink-0 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: action.urgencyColor, color: "#fff" }}
              >
                {action.verb}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {action.target}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {action.reason}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Full Score Breakdown */}
        {opp.score_breakdown && (
          <FullScoreBreakdown breakdown={opp.score_breakdown} />
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Devices</p>
            <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {opp.total_device_estimate.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Revenue Estimate</p>
            <RevenueDisplay deviceCount={opp.total_device_estimate} size="lg" />
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Signal Velocity</p>
            <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {opp.signal_velocity}
              <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>
                /month
              </span>
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sources</p>
            <SourceBadges sources={opp.source_names} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {!opp.is_watched ? (
            <button
              onClick={handleWatch}
              disabled={watchLoading}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {watchLoading ? "Adding..." : "Add to Watchlist"}
            </button>
          ) : (
            <span
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
            >
              Watching
            </span>
          )}
          {watchError && (
            <span className="text-xs" style={{ color: "var(--critical)" }}>
              {watchError}
            </span>
          )}
        </div>

        {/* AI Deal Brief */}
        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Deal Assessment
          </h2>

          {!opp.asset_opportunity && !opp.recommended_actions ? (
            <KineticDotsLoader label="AI is analyzing this opportunity" />
          ) : (
            <>
              {opp.asset_opportunity && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                    Asset Recovery Potential
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {opp.asset_opportunity}
                  </p>
                </div>
              )}

              {opp.recommended_actions && opp.recommended_actions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                    Recommended Next Steps
                  </h3>
                  <ol className="space-y-2">
                    {opp.recommended_actions.map((action, i) => (
                      <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-mono font-semibold shrink-0" style={{ color: "var(--accent)" }}>
                          {i + 1}.
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>

        {/* Signal Evidence */}
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Signal Evidence ({opp.signals.length})
          </h2>
          <div className="space-y-3">
            {opp.signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      </div>
    </PlanGate>
  );
}
