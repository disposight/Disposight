"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type PipelineActivity } from "@/lib/api";

const ACTIVITY_ICONS: Record<string, string> = {
  status_change: "~",
  note: "N",
  call: "C",
  email: "@",
  meeting: "M",
  claim: ">",
  follow_up_set: "F",
  follow_up_cleared: "F",
  priority_change: "!",
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: "var(--accent)",
  note: "var(--text-muted)",
  call: "var(--high)",
  email: "var(--medium)",
  meeting: "var(--critical)",
  claim: "var(--accent)",
  follow_up_set: "var(--medium)",
  follow_up_cleared: "var(--text-muted)",
  priority_change: "var(--high)",
};

const ACTIVITY_TYPE_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface ActivityTimelineProps {
  watchlistId: string;
}

export function ActivityTimeline({ watchlistId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("note");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadActivities = useCallback(() => {
    api
      .getActivities(watchlistId)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [watchlistId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const activity = await api.addActivity(watchlistId, {
        activity_type: formType,
        title: formTitle.trim(),
        body: formBody.trim() || undefined,
      });
      setActivities((prev) => [activity, ...prev]);
      setFormTitle("");
      setFormBody("");
      setShowForm(false);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Activity ({activities.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {showForm ? "Cancel" : "Add Activity"}
        </button>
      </div>

      {showForm && (
        <div className="p-4 space-y-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
          <div className="flex gap-2">
            {ACTIVITY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormType(opt.value)}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: formType === opt.value ? "var(--accent-muted)" : "var(--bg-elevated)",
                  color: formType === opt.value ? "var(--accent-text)" : "var(--text-secondary)",
                  border: `1px solid ${formType === opt.value ? "var(--accent)" : "var(--border-default)"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Activity title..."
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <textarea
            placeholder="Notes (optional)..."
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded text-sm outline-none resize-none"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!formTitle.trim() || submitting}
            className="px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-4">
          <div className="h-8 rounded animate-pulse" style={{ backgroundColor: "var(--bg-elevated)" }} />
        </div>
      ) : activities.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No activity yet</p>
        </div>
      ) : (
        <div className="relative pl-8 pr-4 py-3">
          {/* Vertical line */}
          <div
            className="absolute left-[18px] top-3 bottom-3 w-px"
            style={{ backgroundColor: "var(--border-default)" }}
          />
          <div className="space-y-4">
            {activities.map((a) => (
              <div key={a.id} className="relative flex gap-3">
                {/* Dot */}
                <div
                  className="absolute -left-[22px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: `2px solid ${ACTIVITY_COLORS[a.activity_type] || "var(--text-muted)"}`,
                    color: ACTIVITY_COLORS[a.activity_type] || "var(--text-muted)",
                  }}
                >
                  {ACTIVITY_ICONS[a.activity_type] || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {a.title}
                  </p>
                  {a.body && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {a.body}
                    </p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {a.user_name || "System"} &middot; {timeAgo(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
