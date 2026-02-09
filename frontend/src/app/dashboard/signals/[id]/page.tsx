"use client";

import { useParams } from "next/navigation";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Signal } from "@/lib/api";

export default function SignalDetailRedirect() {
  const params = useParams();
  const id = params.id as string;
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSignal(id)
      .then(setSignal)
      .catch(() => setSignal(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && signal) {
      window.location.href = `/dashboard/opportunities/${signal.company_id}/signals/${id}`;
    }
  }, [loading, signal, id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
        <div className="h-48 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      </div>
    );
  }

  if (!signal) {
    return <p style={{ color: "var(--text-muted)" }}>Signal not found</p>;
  }

  return (
    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
      Redirecting...
    </div>
  );
}
