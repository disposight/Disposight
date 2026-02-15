"use client";

import { useState } from "react";
import type { ContactInfo } from "@/lib/api";

const seniorityColors: Record<string, { bg: string; text: string }> = {
  c_level: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  vp: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  director: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
  manager: { bg: "rgba(156, 163, 175, 0.2)", text: "#9ca3af" },
  unknown: { bg: "rgba(156, 163, 175, 0.2)", text: "#9ca3af" },
};

const seniorityLabels: Record<string, string> = {
  c_level: "C-Level",
  vp: "VP",
  director: "Director",
  manager: "Manager",
  unknown: "Staff",
};

const emailStatusColors: Record<string, string> = {
  valid: "#10b981",
  risky: "#f59e0b",
  unverified: "#9ca3af",
  invalid: "#ef4444",
  failed: "#ef4444",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] transition-colors"
      style={{
        backgroundColor: copied ? "rgba(16, 185, 129, 0.15)" : "var(--bg-elevated)",
        color: copied ? "#10b981" : "var(--text-muted)",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface ContactCardProps {
  contact: ContactInfo;
}

export function ContactCard({ contact }: ContactCardProps) {
  const seniority = contact.seniority_level || "unknown";
  const colors = seniorityColors[seniority] || seniorityColors.unknown;
  const label = seniorityLabels[seniority] || "Staff";
  const statusColor = emailStatusColors[contact.email_status] || emailStatusColors.unverified;

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Header: name + seniority badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown"}
          </p>
          {contact.title && (
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {contact.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {label}
          </span>
          {contact.decision_maker_score != null && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              {contact.decision_maker_score}
            </span>
          )}
        </div>
      </div>

      {/* Contact details */}
      <div className="space-y-1.5">
        {contact.email && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: statusColor }}
              title={`Email: ${contact.email_status}`}
            />
            <span
              className="text-xs font-mono truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {contact.email}
            </span>
            <CopyButton text={contact.email} />
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: "#10b981" }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {contact.phone}
            </span>
            <CopyButton text={contact.phone} />
          </div>
        )}
      </div>
    </div>
  );
}
