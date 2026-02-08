"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type CompanyListResponse } from "@/lib/api";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--critical)";
  if (score >= 60) return "var(--high)";
  if (score >= 40) return "var(--medium)";
  return "var(--low)";
}

export default function CompaniesPage() {
  const [data, setData] = useState<CompanyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), per_page: "20" };
    if (search) params.search = search;

    api
      .getCompanies(params)
      .then(setData)
      .catch(() => setData({ companies: [], total: 0, page: 1, per_page: 20 }))
      .finally(() => setLoading(false));
  }, [search, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Companies
        </h1>
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-md text-sm w-64 outline-none"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Company</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Location</th>
              <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Industry</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Signals</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Risk Score</th>
              <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "var(--bg-elevated)" }} />
                    </td>
                  </tr>
                ))
              : data?.companies.map((company) => (
                  <tr
                    key={company.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border-default)" }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/companies/${company.id}`} className="text-sm font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
                        {company.name}
                      </Link>
                      {company.ticker && (
                        <span className="ml-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          {company.ticker}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {company.headquarters_city}{company.headquarters_state ? `, ${company.headquarters_state}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {company.industry || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                      {company.signal_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-mono font-medium" style={{ color: scoreColor(company.composite_risk_score) }}>
                        {company.composite_risk_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: company.risk_trend === "rising" ? "var(--critical)" : company.risk_trend === "declining" ? "var(--low)" : "var(--text-muted)" }}>
                      {company.risk_trend === "rising" ? "↑" : company.risk_trend === "declining" ? "↓" : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && !data?.companies.length && (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No companies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
