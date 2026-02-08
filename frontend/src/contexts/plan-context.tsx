"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UserProfile } from "@/lib/api";

interface PlanContextValue {
  plan: string | null;
  loading: boolean;
  isPaid: boolean;
  user: UserProfile | null;
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  loading: true,
  isPaid: false,
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

  return (
    <PlanContext.Provider value={{ plan, loading, isPaid, user }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
