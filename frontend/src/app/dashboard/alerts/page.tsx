"use client";

import { useEffect, useState } from "react";
import { api, type Alert } from "@/lib/api";
import { PlanGate } from "@/components/dashboard/plan-gate";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAlerts()
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (alert: Alert) => {
    const updated = await api.updateAlert(alert.id, { is_active: !alert.is_active });
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDelete = async (id: string) => {
    await api.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCreate = async () => {
    const newAlert = await api.createAlert({
      alert_type: "signal",
      signal_types: ["layoff", "bankruptcy_ch7", "office_closure"],
      min_confidence_score: 50,
      frequency: "daily",
    });
    setAlerts((prev) => [newAlert, ...prev]);
  };

  return (
    <PlanGate>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Alerts
        </h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Create Alert
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-surface)" }} />
          ))}
        </div>
      ) : alerts.length ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: alert.is_active ? "var(--accent)" : "var(--text-muted)" }}
                    />
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {alert.alert_type} alert
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[11px]"
                      style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}
                    >
                      {alert.frequency}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {alert.signal_types.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 rounded text-[11px]"
                        style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    Min confidence: {alert.min_confidence_score}
                    {alert.states.length > 0 && ` · States: ${alert.states.join(", ")}`}
                    {alert.watchlist_only && " · Watchlist only"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(alert)}
                    className="text-xs px-3 py-1 rounded"
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    {alert.is_active ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-xs px-3 py-1 rounded"
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--critical)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-lg text-center" style={{ backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No alerts configured</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Create an alert to get notified when matching signals are detected
          </p>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
