"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type PlanLimitsInfo, type UserProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { CompleteProfileModal } from "@/components/dashboard/complete-profile-modal";

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
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let loaded = false;

    async function loadProfile() {
      if (loaded) return;
      loaded = true;

      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch {
        // First call may fail (session not hydrated, missing tenant, etc.)
        // Try to ensure tenant exists, then retry once.
        try {
          const { data: { user: sbUser } } = await supabase.auth.getUser();
          if (sbUser?.email) {
            await api.authCallback({
              email: sbUser.email,
              full_name: sbUser.user_metadata?.full_name,
            });
          }
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          // Still failed — user will see free/unauthenticated state
        }
      } finally {
        setLoading(false);
      }
    }

    // Wait for Supabase to parse session from cookies before calling the API.
    // onAuthStateChange fires INITIAL_SESSION once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && !loaded) {
          loadProfile();
        } else if (event === "INITIAL_SESSION" && !session) {
          setLoading(false);
        }
      }
    );

    // Safety fallback: if no auth event fires within 3 seconds, try anyway
    const timeout = setTimeout(() => {
      if (!loaded) loadProfile();
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Show profile completion modal for users missing organization_type (e.g. OAuth signups, existing users)
  useEffect(() => {
    if (!loading && user && !user.organization_type) {
      setShowProfileModal(true);
    }
  }, [loading, user]);

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
      {showProfileModal && (
        <CompleteProfileModal onComplete={() => setShowProfileModal(false)} />
      )}
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
