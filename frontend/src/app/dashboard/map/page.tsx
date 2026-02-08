"use client";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Signal Map
      </h1>
      <div
        className="rounded-lg h-[calc(100vh-12rem)] flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
      >
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Geographic signal map
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Leaflet + CartoDB Dark Matter tiles will render here with color-coded markers by risk score
          </p>
        </div>
      </div>
    </div>
  );
}
