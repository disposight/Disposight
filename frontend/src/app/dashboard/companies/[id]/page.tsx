"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Company, type Signal } from "@/lib/api";
import { SignalCard } from "@/components/dashboard/signal-card";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCompany(id), api.getCompanySignals(id)])
      .then(([c, s]) => { setCompany(c); setSignals(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      </div>
    );
  }

  if (!company) {
    return <p style={{ color: "var(--text-muted)" }}>Company not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {company.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {company.ticker && (
              <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                {company.ticker}
              </span>
            )}
            {company.industry && (
              <span
                className="px-2 py-0.5 rounded text-[11px]"
                style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                {company.industry}
              </span>
            )}
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {company.headquarters_city}{company.headquarters_state ? `, ${company.headquarters_state}` : ""}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${scoreColor(company.composite_risk_score)}` }}
          >
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: scoreColor(company.composite_risk_score) }}
            >
              {company.composite_risk_score}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>RISK SCORE</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Signals</p>
          <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
            {company.signal_count}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Trend</p>
          <p
            className="text-xl font-semibold"
            style={{
              color: company.risk_trend === "rising" ? "var(--critical)" : company.risk_trend === "declining" ? "var(--low)" : "var(--text-secondary)",
            }}
          >
            {company.risk_trend}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Last Signal</p>
          <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
            {company.last_signal_at ? new Date(company.last_signal_at).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      {/* Signal Timeline */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Signal Timeline
        </h2>
        {signals.length ? (
          <div className="space-y-3">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No signals yet</p>
        )}
      </div>
    </div>
  );
}
