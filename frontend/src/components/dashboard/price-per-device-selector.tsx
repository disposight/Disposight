"use client";

import { useState } from "react";
import { useRevenue } from "@/contexts/revenue-context";

export function PricePerDeviceSelector() {
  const { pricePerDevice, setPricePerDevice } = useRevenue();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(pricePerDevice));

  const handleSave = () => {
    const num = parseFloat(value);
    if (num > 0 && num <= 10000) {
      setPricePerDevice(num);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          $/device:
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSave}
          autoFocus
          className="w-20 px-2 py-1 rounded text-xs font-mono text-right outline-none"
          style={{
            backgroundColor: "var(--bg-base)",
            border: "1px solid var(--accent)",
            color: "var(--text-primary)",
          }}
          min="1"
          max="10000"
          step="1"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setValue(String(pricePerDevice));
        setEditing(true);
      }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        color: "var(--text-secondary)",
      }}
      title="Click to edit $/device rate"
    >
      <span style={{ color: "var(--text-muted)" }}>$/device:</span>
      <span className="font-mono font-medium" style={{ color: "var(--accent)" }}>
        ${pricePerDevice}
      </span>
    </button>
  );
}
