"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Signal, type SignalAnalysis } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { formatDistanceToNow } from "date-fns";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

function opportunityLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Immediate Pursuit", color: "var(--critical)" };
  if (score >= 70) return { label: "High Priority", color: "var(--high)" };
  if (score >= 55) return { label: "Qualified Pipeline", color: "var(--medium)" };
  return { label: "Background", color: "var(--low)" };
}

const sourceLabels: Record<string, string> = {
  gdelt: "GDELT Global News Monitor",
  courtlistener: "CourtListener (PACER/RECAP)",
  sec_edgar: "SEC EDGAR Filings",
  warn_act: "WARN Act Notice (Dept. of Labor)",
};

function sourceLabel(name: string): string {
  return sourceLabels[name] || name.charAt(0).toUpperCase() + name.slice(1);
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

export default function SignalDrilldownPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const signalId = params.signal_id as string;
  const [signal, setSignal] = useState<Signal | null>(null);
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSignal(signalId)
      .then(setSignal)
      .catch(() => setSignal(null))
      .finally(() => setLoading(false));
  }, [signalId]);

  useEffect(() => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    api
      .getSignalAnalysis(signalId)
      .then(setAnalysis)
      .catch((err) => setAnalysisError(err.message || "Failed to generate analysis"))
      .finally(() => setAnalysisLoading(false));
  }, [signalId]);

  const handleRefresh = () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    api
      .getSignalAnalysis(signalId, true)
      .then(setAnalysis)
      .catch((err) => setAnalysisError(err.message || "Failed to generate analysis"))
      .finally(() => setAnalysisLoading(false));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="h-48 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      </div>
    );
  }

  if (!signal) {
    return <p style={{ color: "var(--text-muted)" }}>Signal not found</p>;
  }

  const timeAgo = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true });
  const opp = analysis ? opportunityLabel(analysis.opportunity_score) : null;

  return (
    <PlanGate>
      <div className="space-y-6 max-w-4xl">
        {/* Back link — goes to opportunity detail */}
        <Link
          href={`/dashboard/opportunities/${companyId}`}
          className="text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; Back to {signal.company_name || "Deal"}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
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
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {timeAgo}
              </span>
            </div>
            <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {signal.title}
            </h1>
            <Link
              href={`/dashboard/opportunities/${signal.company_id}`}
              className="text-sm hover:underline"
              style={{ color: "var(--accent)" }}
            >
              {signal.company_name || "Unknown Company"}
            </Link>
          </div>

          <div className="text-center shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: `3px solid ${scoreColor(signal.severity_score)}` }}
            >
              <span
                className="text-2xl font-mono font-bold"
                style={{ color: scoreColor(signal.severity_score) }}
              >
                {signal.severity_score}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>SEVERITY</span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Confidence</p>
            <p className="text-xl font-mono font-semibold" style={{ color: scoreColor(signal.confidence_score) }}>
              {signal.confidence_score}%
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Affected Employees</p>
            <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {signal.affected_employees?.toLocaleString() || "---"}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Est. Devices</p>
            <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {signal.device_estimate ? `~${signal.device_estimate.toLocaleString()}` : "---"}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Location</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {signal.location_city || signal.location_state
                ? `${signal.location_city || ""}${signal.location_city && signal.location_state ? ", " : ""}${signal.location_state || ""}`
                : "---"}
            </p>
          </div>
        </div>

        {/* Summary */}
        {signal.summary && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              Summary
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {signal.summary}
            </p>
          </div>
        )}

        {/* Source Citation */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)", borderLeft: "3px solid var(--accent)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
            Source
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {sourceLabel(signal.source_name)}
              </p>
              {signal.source_published_at && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Published {new Date(signal.source_published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
            {signal.source_url && (
              <a
                href={signal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded text-xs font-medium shrink-0"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--accent)",
                  border: "1px solid var(--border-default)",
                }}
              >
                View Original &rarr;
              </a>
            )}
          </div>
        </div>

        {/* AI Intelligence Brief */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            AI Intelligence Brief
          </h2>

          {analysisLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded animate-pulse" style={{ backgroundColor: "var(--bg-elevated)" }} />
              ))}
            </div>
          ) : analysisError ? (
            <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-elevated)" }}>
              <p className="text-sm" style={{ color: "var(--critical)" }}>{analysisError}</p>
              <button onClick={handleRefresh} className="mt-2 px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: "var(--accent)", color: "white" }}>
                Retry
              </button>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Opportunity Score */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `3px solid ${opp!.color}` }}>
                  <span className="text-xl font-mono font-bold" style={{ color: opp!.color }}>{analysis.opportunity_score}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: opp!.color }}>{opp!.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>ITAD Deal Score</p>
                </div>
              </div>

              {[
                { title: "Event Breakdown", content: analysis.event_breakdown },
                { title: "ITAD Impact Assessment", content: analysis.itad_impact },
                { title: "Company Context", content: analysis.company_context },
                { title: "Asset Recovery Potential", content: analysis.asset_opportunity },
              ].map(({ title, content }) => content && (
                <div key={title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{title}</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{content}</p>
                </div>
              ))}

              {analysis.recommended_actions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Recommended Next Steps</h3>
                  <ol className="space-y-2">
                    {analysis.recommended_actions.map((action, i) => (
                      <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-mono font-semibold shrink-0" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.correlated_signals_summary && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Multi-Source Confirmation</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>{analysis.correlated_signals_summary}</p>
                </div>
              )}

              {analysis.sources?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Sources</h3>
                  <ol className="space-y-2">
                    {analysis.sources.map((src, i) => (
                      <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-mono font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>[{i + 1}]</span>
                        <div>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{sourceLabel(src.name)}</span>
                          <span style={{ color: "var(--text-muted)" }}> --- </span>
                          <span>{src.title}</span>
                          {src.url && (
                            <> <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>View &rarr;</a></>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {analysis.cached ? "Cached --- " : ""}Generated {formatDistanceToNow(new Date(analysis.generated_at), { addSuffix: true })}
                </span>
                <button onClick={handleRefresh} disabled={analysisLoading} className="px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
                  Refresh Analysis
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </PlanGate>
  );
}
