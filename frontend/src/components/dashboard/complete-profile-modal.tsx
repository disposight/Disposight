"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const REFERRAL_OPTIONS = [
  "Google Search",
  "LinkedIn",
  "Referral / Word of mouth",
  "Conference / Event",
  "Podcast",
  "Other",
];

export function CompleteProfileModal({ onComplete }: { onComplete: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.updateProfile({
        company_name: companyName || undefined,
        job_title: jobTitle || undefined,
        referral_source: referralSource || undefined,
      });
    } catch {
      // Non-fatal — profile update failed but user can still use the app
    }

    onComplete();
  };

  const inputStyle = {
    backgroundColor: "var(--bg-base)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm rounded-lg p-6 mx-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Complete your profile
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Help us personalize your experience.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Director, VP Operations"
              className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>How did you hear about us?</label>
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
              style={inputStyle}
            >
              <option value="">Select one</option>
              {REFERRAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onComplete}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
