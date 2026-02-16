"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const ORG_TYPES = [
  "Liquidation / Surplus",
  "Distressed PE",
  "Equipment Remarketer",
  "Wholesale Buyer",
  "Restructuring Advisory",
  "Auction House",
  "Insurance / Salvage",
  "Other",
];

const ROLES = [
  "Biz Dev / Deal Sourcing",
  "Valuation / Appraisal",
  "Portfolio / Investment",
  "Operations / Logistics",
  "Executive / C-Suite",
  "Other",
];

const GOALS = [
  "Find deals before competitors",
  "Monitor companies I track",
  "Early warning on events",
  "Research companies / industries",
  "Other",
];

function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors text-left"
      style={{
        backgroundColor: selected ? "var(--accent-muted, rgba(16, 185, 129, 0.15))" : "var(--bg-base)",
        border: selected ? "1px solid var(--accent)" : "1px solid var(--border-default)",
        color: selected ? "var(--accent-text, var(--accent))" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

export function CompleteProfileModal({ onComplete }: { onComplete: () => void }) {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [organizationType, setOrganizationType] = useState("");
  const [orgTypeOther, setOrgTypeOther] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobTitleOther, setJobTitleOther] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [goalOther, setGoalOther] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const resolvedOrgType = organizationType === "Other" ? orgTypeOther : organizationType;
    const resolvedJobTitle = jobTitle === "Other" ? jobTitleOther : jobTitle;
    const resolvedGoal = primaryGoal === "Other" ? goalOther : primaryGoal;

    try {
      await api.updateProfile({
        organization_type: resolvedOrgType || undefined,
        job_title: resolvedJobTitle || undefined,
        primary_goal: resolvedGoal || undefined,
        referral_source: referralSource || undefined,
      });
    } catch {
      // Non-fatal
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
        className="w-full max-w-md rounded-lg p-6 mx-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {screen === 1 ? "Complete your profile" : "What are you looking for?"}
          </h2>
          <div className="flex gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full"
                style={{
                  width: s === screen ? "1.25rem" : "0.375rem",
                  backgroundColor: s <= screen ? "var(--accent)" : "var(--border-default)",
                }}
              />
            ))}
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          {screen === 1 ? "Help us personalize your experience." : "One more step to get you set up."}
        </p>

        {screen === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Organization Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ORG_TYPES.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={organizationType === opt}
                    onSelect={() => setOrganizationType(opt)}
                  />
                ))}
              </div>
              {organizationType === "Other" && (
                <input
                  type="text"
                  value={orgTypeOther}
                  onChange={(e) => setOrgTypeOther(e.target.value)}
                  placeholder="Your organization type"
                  className="w-full mt-2 px-3 py-1.5 rounded-md text-sm outline-none"
                  style={inputStyle}
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Your Role
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={jobTitle === opt}
                    onSelect={() => setJobTitle(opt)}
                  />
                ))}
              </div>
              {jobTitle === "Other" && (
                <input
                  type="text"
                  value={jobTitleOther}
                  onChange={(e) => setJobTitleOther(e.target.value)}
                  placeholder="Your role"
                  className="w-full mt-2 px-3 py-1.5 rounded-md text-sm outline-none"
                  style={inputStyle}
                  autoFocus
                />
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 py-2 rounded-md text-sm font-medium"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setScreen(2)}
                className="flex-1 py-2 rounded-md text-sm font-medium"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {screen === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Primary Goal
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GOALS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={primaryGoal === opt}
                    onSelect={() => setPrimaryGoal(opt)}
                  />
                ))}
              </div>
              {primaryGoal === "Other" && (
                <input
                  type="text"
                  value={goalOther}
                  onChange={(e) => setGoalOther(e.target.value)}
                  placeholder="Your primary goal"
                  className="w-full mt-2 px-3 py-1.5 rounded-md text-sm outline-none"
                  style={inputStyle}
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                How did you find DispoSight?{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <textarea
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                placeholder="e.g., colleague, LinkedIn, conference, Google..."
                rows={2}
                className="w-full px-3 py-1.5 rounded-md text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setScreen(1)}
                className="flex-1 py-2 rounded-md text-sm font-medium"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
