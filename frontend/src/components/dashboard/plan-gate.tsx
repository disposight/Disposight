"use client";

import Link from "next/link";
import { usePlan } from "@/contexts/plan-context";
import type { ReactNode } from "react";

export function PlanGate({ children }: { children: ReactNode }) {
  const { loading, isPaid, isTrial, daysLeft, trialEndsAt } = usePlan();

  if (loading) {
    return (
      <div className="space-y-4">
        <div
          className="h-8 w-48 rounded animate-pulse"
          style={{ backgroundColor: "var(--bg-surface)" }}
        />
        <div
          className="h-64 rounded-lg animate-pulse"
          style={{ backgroundColor: "var(--bg-surface)" }}
        />
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="max-w-md w-full rounded-lg p-8 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "var(--accent-muted)" }}
          >
            <span className="text-2xl">&#x1F512;</span>
          </div>

          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Upgrade to Access
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            This feature is available on paid plans. Upgrade to unlock full
            access to DispoSight intelligence.
          </p>

          <div
            className="rounded-md p-4 mb-6 text-left"
            style={{ backgroundColor: "var(--bg-base)" }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wider mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Paid plans include
            </p>
            <ul className="space-y-2">
              {[
                "Real-time distress signals from 4 pipelines",
                "Company risk scores and trend analysis",
                "Interactive signal map with geographic filtering",
                "Custom watchlists and alert rules",
                "Email notifications (real-time, daily, weekly)",
                "Full access to WARN, GDELT, SEC & Court data",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    &#x2713;
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/dashboard/settings"
            className="inline-block px-6 py-2.5 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Upgrade Now
          </Link>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Starting at $99/month
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isTrial && trialEndsAt && (
        <div
          className="mb-4 flex items-center justify-between rounded-md px-4 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--accent-muted)",
            border: "1px solid var(--accent)",
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>
            Trial ends {trialEndsAt.toLocaleDateString()} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
          </span>
          <Link
            href="/dashboard/settings"
            className="px-3 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            Upgrade Now
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
