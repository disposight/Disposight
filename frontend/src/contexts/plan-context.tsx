"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UserProfile } from "@/lib/api";

interface PlanContextValue {
  plan: string | null;
  loading: boolean;
  isPaid: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  daysLeft: number | null;
  user: UserProfile | null;
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  loading: true,
  isPaid: false,
  isTrial: false,
  trialEndsAt: null,
  daysLeft: null,
  user: null,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan = user?.plan ?? null;
  const isPaid = plan !== null && plan !== "free";
  const isTrial = plan === "trialing";
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;

  let daysLeft: number | null = null;
  if (trialEndsAt) {
    const ms = trialEndsAt.getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return (
    <PlanContext.Provider value={{ plan, loading, isPaid, isTrial, trialEndsAt, daysLeft, user }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
