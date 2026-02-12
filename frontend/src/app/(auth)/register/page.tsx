"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";

const REFERRAL_OPTIONS = [
  "Google Search",
  "LinkedIn",
  "Referral / Word of mouth",
  "Conference / Event",
  "Podcast",
  "Other",
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create tenant + user via our API
    try {
      await api.authCallback({
        email,
        full_name: fullName || undefined,
        company_name: companyName || undefined,
        job_title: jobTitle || undefined,
        referral_source: referralSource || undefined,
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
        <div className="text-center mb-8">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="DispoSight" className="h-16 mx-auto mb-3" />
            <h1 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              DispoSight
            </h1>
          </Link>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Create your account
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md text-sm outline-none"
              style={inputStyle}
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

          {error && (
            <p className="text-xs" style={{ color: "var(--critical)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "var(--accent-text)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
