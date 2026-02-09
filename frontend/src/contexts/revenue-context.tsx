"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface RevenueContextValue {
  pricePerDevice: number;
  setPricePerDevice: (price: number) => void;
  loading: boolean;
  computeRevenue: (deviceCount: number) => number;
  formatRevenue: (deviceCount: number) => string;
}

const RevenueContext = createContext<RevenueContextValue>({
  pricePerDevice: 45,
  setPricePerDevice: () => {},
  loading: true,
  computeRevenue: () => 0,
  formatRevenue: () => "$0",
});

export function RevenueProvider({ children }: { children: ReactNode }) {
  const [pricePerDevice, setPricePerDeviceState] = useState(45);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRevenueSettings()
      .then((s) => setPricePerDeviceState(s.price_per_device))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setPricePerDevice = useCallback((price: number) => {
    setPricePerDeviceState(price);
    api.updateRevenueSettings(price).catch(() => {});
  }, []);

  const computeRevenue = useCallback(
    (deviceCount: number) => deviceCount * pricePerDevice,
    [pricePerDevice]
  );

  const formatRevenue = useCallback(
    (deviceCount: number) => {
      const value = deviceCount * pricePerDevice;
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    },
    [pricePerDevice]
  );

  return (
    <RevenueContext.Provider
      value={{ pricePerDevice, setPricePerDevice, loading, computeRevenue, formatRevenue }}
    >
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenue() {
  return useContext(RevenueContext);
}
