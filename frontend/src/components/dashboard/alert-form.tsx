"use client";

import { useState } from "react";
import type { Alert, AlertCreate } from "@/lib/api";

const SIGNAL_TYPES = [
  "layoff",
  "office_closure",
  "facility_shutdown",
  "plant_closing",
  "bankruptcy_ch7",
  "bankruptcy_ch11",
  "merger",
  "acquisition",
  "liquidation",
  "ceasing_operations",
  "restructuring",
  "relocation",
] as const;

const FREQUENCIES = [
  { value: "realtime", label: "Real-time" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
] as const;

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\bch(\d+)/g, "Ch.$1").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AlertFormProps {
  alert?: Alert;
  onSubmit: (data: AlertCreate) => void;
  onCancel: () => void;
  saving: boolean;
}

export function AlertForm({ alert, onSubmit, onCancel, saving }: AlertFormProps) {
  const [signalTypes, setSignalTypes] = useState<Set<string>>(
    new Set(alert?.signal_types ?? [])
  );
  const [frequency, setFrequency] = useState(alert?.frequency ?? "realtime");
  const [minConfidence, setMinConfidence] = useState(alert?.min_confidence_score ?? 50);
  const [minSeverity, setMinSeverity] = useState(alert?.min_severity_score ?? 0);
  const [statesInput, setStatesInput] = useState(alert?.states?.join(", ") ?? "");
  const [watchlistOnly, setWatchlistOnly] = useState(alert?.watchlist_only ?? false);
  const [error, setError] = useState("");

  const toggleType = (t: string) => {
    setSignalTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setError("");
  };

  const selectAll = () => {
    setSignalTypes(new Set(SIGNAL_TYPES));
    setError("");
  };
  const clearAll = () => setSignalTypes(new Set());

  const handleSubmit = () => {
    if (signalTypes.size === 0) {
      setError("Select at least 1 signal type");
      return;
    }
    const states = statesInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    onSubmit({
      alert_type: "signal",
      signal_types: Array.from(signalTypes),
      frequency,
      min_confidence_score: minConfidence,
      min_severity_score: minSeverity,
      states,
      watchlist_only: watchlistOnly,
    });
  };

  return (
    <div
      className="p-5 rounded-lg space-y-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      {/* Signal Types */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Signal Types
          </label>
          <span className="flex gap-2 text-xs">
            <button type="button" onClick={selectAll} className="hover:underline" style={{ color: "var(--accent)" }}>
              Select all
            </button>
            <button type="button" onClick={clearAll} className="hover:underline" style={{ color: "var(--text-muted)" }}>
              Clear
            </button>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {SIGNAL_TYPES.map((t) => (
            <label
              key={t}
              className="flex items-center gap-2 text-xs cursor-pointer select-none rounded px-2 py-1.5"
              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              <input
                type="checkbox"
                checked={signalTypes.has(t)}
                onChange={() => toggleType(t)}
                className="rounded"
                style={{ accentColor: "var(--accent)" }}
              />
              {formatType(t)}
            </label>
          ))}
        </div>
        {error && (
          <p className="text-xs mt-1.5" style={{ color: "var(--critical)" }}>{error}</p>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label className="text-sm font-medium block mb-2" style={{ color: "var(--text-primary)" }}>
          Frequency
        </label>
        <div className="flex gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: frequency === f.value ? "var(--accent)" : "var(--bg-elevated)",
                color: frequency === f.value ? "#fff" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
            Min Confidence
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
            Min Severity
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={minSeverity}
            onChange={(e) => setMinSeverity(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-full px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>
      </div>

      {/* States */}
      <div>
        <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
          States <span className="font-normal" style={{ color: "var(--text-muted)" }}>(comma-separated, e.g. CA, NY, TX)</span>
        </label>
        <input
          type="text"
          value={statesInput}
          onChange={(e) => setStatesInput(e.target.value)}
          placeholder="Leave empty for all states"
          className="w-full px-3 py-1.5 rounded text-sm"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
          }}
        />
      </div>

      {/* Watchlist Only Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Watchlist companies only
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={watchlistOnly}
          onClick={() => setWatchlistOnly(!watchlistOnly)}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ backgroundColor: watchlistOnly ? "var(--accent)" : "var(--bg-elevated)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: watchlistOnly ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {saving ? "Saving..." : alert ? "Save Changes" : "Create Alert"}
        </button>
      </div>
    </div>
  );
}
