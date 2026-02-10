"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type PlanLimitsInfo, type UserProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase";

interface PlanContextValue {
  plan: string | null;
  loading: boolean;
  isPaid: boolean;
  isTrial: boolean;
  isStarter: boolean;
  isPro: boolean;
  trialEndsAt: Date | null;
  daysLeft: number | null;
  user: UserProfile | null;
  planLimits: PlanLimitsInfo | null;
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  loading: true,
  isPaid: false,
  isTrial: false,
  isStarter: false,
  isPro: false,
  trialEndsAt: null,
  daysLeft: null,
  user: null,
  planLimits: null,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch (err) {
        // If getMe fails (403/404), the tenant record may be missing.
        // Attempt to create it from the Supabase session, then retry.
        const message = err instanceof Error ? err.message : "";
        if (message.includes("tenant") || message.includes("not found") || message.includes("403")) {
          try {
            const supabase = createClient();
            const { data: { user: sbUser } } = await supabase.auth.getUser();
            if (sbUser?.email) {
              await api.authCallback({
                email: sbUser.email,
                full_name: sbUser.user_metadata?.full_name,
              });
              // Retry getMe after tenant creation
              const profile = await api.getMe();
              setUser(profile);
            }
          } catch {
            // Still failed — user will see free/unauthenticated state
          }
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const plan = user?.plan ?? null;
  const isPaid = plan !== null && plan !== "free";
  const isTrial = plan === "trialing";
  const isStarter = plan === "starter" || plan === "trialing";
  const isPro = plan === "pro";
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const planLimits = user?.plan_limits ?? null;

  let daysLeft: number | null = null;
  if (trialEndsAt) {
    const ms = trialEndsAt.getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return (
    <PlanContext.Provider value={{ plan, loading, isPaid, isTrial, isStarter, isPro, trialEndsAt, daysLeft, user, planLimits }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
