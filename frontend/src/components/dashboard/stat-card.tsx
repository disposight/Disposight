interface StatCardProps {
  label: string;
  value: number;
  trend?: string;
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {value.toLocaleString()}
        </span>
        {trend && (
          <span
            className="text-xs mb-1"
            style={{ color: trend === "up" ? "var(--critical)" : "var(--low)" }}
          >
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </div>
  );
}
