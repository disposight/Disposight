"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type GapDetectionResponse, type GapOpportunity } from "@/lib/api";
import { DealScoreBadge } from "./deal-score-badge";

interface UncoveredDealsProps {
  onWatch?: (companyId: string) => void;
}

export function UncoveredDeals({ onWatch }: UncoveredDealsProps) {
  const [data, setData] = useState<GapDetectionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOpportunityGaps(5)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleTrack = async (companyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onWatch) return;
    onWatch(companyId);
    // Optimistically remove the card
    if (data) {
      setData({
        ...data,
        gaps: data.gaps.filter((g) => g.opportunity.company_id !== companyId),
        total_uncovered: Math.max(0, data.total_uncovered - 1),
      });
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-48 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // All tracked state
  if (data.total_uncovered === 0 && data.profile.watchlist_count > 0) {
    return (
      <div
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          You&apos;re covering all available opportunities
        </p>
      </div>
    );
  }

  const hasProfile = data.profile.states.length > 0 || data.profile.industries.length > 0 || data.profile.signal_types.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Uncovered Opportunities
          </h2>
          {data.total_uncovered > 0 && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
              style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {data.total_uncovered}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/settings"
          className="text-xs font-medium transition-colors hover:underline"
          style={{ color: "var(--accent-text)" }}
        >
          Customize
        </Link>
      </div>

      {/* Profile chips */}
      {hasProfile && (
        <div className="flex flex-wrap gap-1 mb-3">
          {data.profile.states.map((s) => (
            <span
              key={`s-${s}`}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              {s}
            </span>
          ))}
          {data.profile.industries.map((i) => (
            <span
              key={`i-${i}`}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              {i}
            </span>
          ))}
          {data.profile.signal_types.map((t) => (
            <span
              key={`t-${t}`}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              {t.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasProfile && data.profile.watchlist_count === 0 && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Start tracking companies to get personalized recommendations
        </p>
      )}

      {/* Gap cards */}
      {data.gaps.length > 0 ? (
        <div className="space-y-2">
          {data.gaps.map((gap) => (
            <GapCard key={gap.opportunity.company_id} gap={gap} onTrack={handleTrack} />
          ))}
        </div>
      ) : (
        <div
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No uncovered deals found</p>
        </div>
      )}

      {/* Footer link */}
      {data.total_uncovered > data.gaps.length && (
        <div className="mt-2 text-center">
          <button
            onClick={() => {
              // Navigate to expanded view with all deals
              const event = new CustomEvent("showAllDeals");
              window.dispatchEvent(event);
            }}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: "var(--accent-text)" }}
          >
            View {data.total_uncovered - data.gaps.length} more matches
          </button>
        </div>
      )}
    </div>
  );
}

function GapCard({
  gap,
  onTrack,
}: {
  gap: GapOpportunity;
  onTrack: (companyId: string, e: React.MouseEvent) => void;
}) {
  const opp = gap.opportunity;

  return (
    <Link href={`/dashboard/opportunities/${opp.company_id}`}>
      <div
        className="p-3 rounded-lg transition-colors cursor-pointer hover:border-[var(--accent)]"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <DealScoreBadge score={opp.deal_score} bandLabel={opp.score_band_label} size="sm" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {gap.is_new && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
                >
                  NEW
                </span>
              )}
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {opp.company_name}
              </h3>
              {opp.headquarters_state && (
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {opp.headquarters_state}
                </span>
              )}
            </div>

            {/* Match reasons */}
            <div className="flex flex-wrap gap-1">
              {gap.match_reasons.map((reason, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>

          {/* Track button */}
          <button
            onClick={(e) => onTrack(opp.company_id, e)}
            className="shrink-0 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: "var(--accent-muted)",
              color: "var(--accent-text)",
              border: "1px solid var(--accent)",
            }}
          >
            Track
          </button>
        </div>
      </div>
    </Link>
  );
}
