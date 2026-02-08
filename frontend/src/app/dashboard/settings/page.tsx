"use client";

import { useEffect, useState } from "react";
import { api, type UserProfile } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await api.getPortal();
      window.location.href = portal_url;
    } catch {
      // If no billing account, create checkout
      const { checkout_url } = await api.createCheckout();
      window.location.href = checkout_url;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="h-32 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Settings
      </h1>

      {/* Profile */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Profile
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Email</label>
            <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{user?.email || "—"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Name</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.full_name || "—"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Role</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.role || "—"}</p>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Organization
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Tenant</label>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{user?.tenant_name || "—"}</p>
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Plan</label>
            <p className="text-sm font-mono" style={{ color: "var(--accent-text)" }}>
              {user?.plan?.toUpperCase() || "FREE"}
            </p>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Billing
        </h2>
        <button
          onClick={handleManageBilling}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Manage Billing
        </button>
      </div>
    </div>
  );
}
