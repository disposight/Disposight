"use client";

import Link from "next/link";

interface UpgradePromptProps {
  message: string;
}

export function UpgradePrompt({ message }: UpgradePromptProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        color: "var(--text-secondary)",
      }}
    >
      <span>{message}</span>
      <Link
        href="/dashboard/settings"
        className="shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        Upgrade Plan
      </Link>
    </div>
  );
}
