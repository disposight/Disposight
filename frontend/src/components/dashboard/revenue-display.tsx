"use client";

import { useRevenue } from "@/contexts/revenue-context";

interface RevenueDisplayProps {
  deviceCount: number;
  size?: "sm" | "md" | "lg";
}

export function RevenueDisplay({ deviceCount, size = "md" }: RevenueDisplayProps) {
  const { formatRevenue, pricePerDevice } = useRevenue();

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <span
      className={`${sizeClasses[size]} font-mono font-semibold`}
      style={{ color: "var(--accent)" }}
      title={`${deviceCount.toLocaleString()} devices x $${pricePerDevice}/device`}
    >
      {formatRevenue(deviceCount)}
    </span>
  );
}
