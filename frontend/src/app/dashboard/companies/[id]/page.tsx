"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function CompanyDetailRedirect() {
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    window.location.href = `/dashboard/opportunities/${id}`;
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
      <div className="h-48 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
    </div>
  );
}
