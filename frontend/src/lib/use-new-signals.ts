"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase";

const POLL_INTERVAL = 60_000; // 1 minute

/**
 * Hook that tracks new signal count via polling + Supabase Realtime.
 * Returns { newCount, lastChecked, dismiss } for badge display.
 */
export function useNewSignals() {
  const [newCount, setNewCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string>(
    new Date().toISOString()
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const result = await api.checkNewSignals(lastChecked);
      if (result.new_count > 0) {
        setNewCount((prev) => prev + result.new_count);
        if (result.latest_at) {
          setLastChecked(result.latest_at);
        }
      }
    } catch {
      // Silently fail — user might not be authed yet
    }
  }, [lastChecked]);

  const dismiss = useCallback(() => {
    setNewCount(0);
    setLastChecked(new Date().toISOString());
  }, []);

  // Polling
  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  // Supabase Realtime — listen for INSERT on signals table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("signals-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        () => {
          setNewCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { newCount, lastChecked, dismiss };
}
