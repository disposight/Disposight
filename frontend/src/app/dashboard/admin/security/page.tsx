"use client";

import { useEffect, useState } from "react";
import { api, type SecurityReport, type AuditHistoryItem } from "@/lib/api";
import { usePlan } from "@/contexts/plan-context";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  pass: "#10b981",
  warn: "#f59e0b",
  fail: "#ef4444",
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function SecurityDashboardPage() {
  const { user, loading: planLoading } = usePlan();
  const router = useRouter();
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    if (!planLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [planLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      api.getAuditHistory().then(setHistory).catch(() => {});
    }
  }, [isAdmin]);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.runSecurityAudit();
      setReport(result);
      api.getAuditHistory().then(setHistory).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const sortedChecks = report?.checks
    ? [...report.checks].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Security Audit
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Automated security checks across app, database, and infrastructure
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
          }}
        >
          {loading ? "Running..." : "Run Audit Now"}
        </button>
      </div>

      {error && (
        <div
          className="p-4 rounded-md text-sm"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div
            className="p-4 rounded-lg border"
            style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[report.overall_status] ?? "#6b7280" }}
              />
              <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Overall: {report.overall_status.toUpperCase()}
              </span>
              <span className="text-sm ml-auto" style={{ color: "var(--text-muted)" }}>
                {new Date(report.run_at).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>{report.summary.passed} passed</span>
              <span>{report.summary.warnings} warnings</span>
              <span>{report.summary.failures} failures</span>
            </div>
          </div>

          {/* Individual Checks */}
          <div className="space-y-2">
            {sortedChecks.map((check) => (
              <div
                key={check.name}
                className="p-3 rounded-md border flex items-start gap-3"
                style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[check.status] ?? "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {check.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium"
                      style={{
                        backgroundColor:
                          check.severity === "critical"
                            ? "rgba(239, 68, 68, 0.15)"
                            : check.severity === "high"
                            ? "rgba(249, 115, 22, 0.15)"
                            : check.severity === "medium"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(107, 114, 128, 0.15)",
                        color:
                          check.severity === "critical"
                            ? "#ef4444"
                            : check.severity === "high"
                            ? "#f97316"
                            : check.severity === "medium"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    >
                      {check.severity}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {check.message}
                  </p>
                  {check.details && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {check.details}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs font-medium uppercase flex-shrink-0"
                  style={{ color: STATUS_COLORS[check.status] ?? "#6b7280" }}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Audit History
          </h2>
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border-default)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--bg-surface)" }}>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>
                    Date
                  </th>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>
                    Status
                  </th>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>
                    Checks
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                    style={{ borderColor: "var(--border-default)" }}
                  >
                    <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ color: STATUS_COLORS[item.overall_status] ?? "#6b7280" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[item.overall_status] ?? "#6b7280" }}
                        />
                        {item.overall_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>
                      {Array.isArray(item.checks) ? `${item.checks.length} checks` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
