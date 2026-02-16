"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
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
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
      style={{
        backgroundColor: selected ? "var(--accent-muted, rgba(16, 185, 129, 0.15))" : "var(--bg-surface)",
        border: selected ? "1px solid var(--accent)" : "1px solid var(--border-default)",
        color: selected ? "var(--accent-text, var(--accent))" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [organizationType, setOrganizationType] = useState("");
  const [orgTypeOther, setOrgTypeOther] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobTitleOther, setJobTitleOther] = useState("");

  // Step 3
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [goalOther, setGoalOther] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError("");

    const resolvedOrgType = organizationType === "Other" ? orgTypeOther : organizationType;
    const resolvedJobTitle = jobTitle === "Other" ? jobTitleOther : jobTitle;
    const resolvedGoal = primaryGoal === "Other" ? goalOther : primaryGoal;

    try {
      await api.authCallback({
        email,
        full_name: fullName || undefined,
        job_title: resolvedJobTitle || undefined,
        referral_source: referralSource || undefined,
        organization_type: resolvedOrgType || undefined,
        primary_goal: resolvedGoal || undefined,
      });
    } catch {
      // Non-fatal: tenant will be created on first dashboard load
    }

    router.push("/dashboard");
  };

  const inputStyle = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="DispoSight" className="h-16 mx-auto mb-3" />
            <h1 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              DispoSight
            </h1>
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-2 rounded-full transition-all"
              style={{
                width: s === step ? "2rem" : "0.5rem",
                backgroundColor: s <= step ? "var(--accent)" : "var(--border-default)",
              }}
            />
          ))}
        </div>

        {/* Step 1: Account Creation */}
        {step === 1 && (
          <>
            <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>
              Create your account
            </p>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-default)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-default)" }} />
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {error && (
                <p className="text-xs" style={{ color: "var(--critical)" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {loading ? "Creating account..." : "Continue"}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <Link href="/login" className="hover:underline" style={{ color: "var(--accent-text)" }}>
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* Step 2: Organization + Role */}
        {step === 2 && (
          <>
            <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>
              Help us personalize your experience
            </p>

            <div className="space-y-5">
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
                  onClick={() => setStep(1)}
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
                  onClick={() => setStep(3)}
                  className="flex-1 py-2 rounded-md text-sm font-medium"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Goal + Attribution */}
        {step === 3 && (
          <>
            <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>
              What are you looking for?
            </p>

            <div className="space-y-5">
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
                  <span className="font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
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

              {error && (
                <p className="text-xs" style={{ color: "var(--critical)" }}>{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
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
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  {loading ? "Starting..." : "Start Free Trial"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
