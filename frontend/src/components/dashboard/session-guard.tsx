"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // If the user logged in without "Remember me" and this is a new browser
    // session (sessionStorage is empty), sign them out.
    const remember = sessionStorage.getItem("disposight_remember");
    const sessionOnly = sessionStorage.getItem("disposight_session_only");

    if (!remember && !sessionOnly) {
      // New browser session — check if there's a persisted auth cookie
      // from a previous "session only" login that should be cleared.
      const wasPreviouslySessionOnly = localStorage.getItem("disposight_session_only");
      if (wasPreviouslySessionOnly) {
        localStorage.removeItem("disposight_session_only");
        const supabase = createClient();
        supabase.auth.signOut().then(() => router.push("/login"));
      }
    }

    // Persist the session-only flag to localStorage so we can detect
    // new browser sessions (sessionStorage clears on close).
    if (sessionOnly) {
      localStorage.setItem("disposight_session_only", "1");
    } else if (remember) {
      localStorage.removeItem("disposight_session_only");
    }
  }, [router]);

  return <>{children}</>;
}
