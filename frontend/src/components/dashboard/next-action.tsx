import type { Opportunity } from "@/lib/api";

interface NextAction {
  verb: string;       // "Call" | "Contact" | "Email" | "Prepare" | "Monitor"
  target: string;     // "IT Asset Manager" | "Trustee / Receiver" | ...
  reason: string;     // contextual why-now sentence
  urgencyColor: string;
}

// --- Who to contact, keyed by the most urgent signal type present ---

const CONTACT_MAP: Record<string, { target: string; context: string }> = {
  bankruptcy_ch7:      { target: "Trustee / Receiver",        context: "Ch. 7 liquidation — assets are being sold NOW" },
  liquidation:         { target: "Trustee / Receiver",        context: "Liquidation underway — equipment hitting surplus" },
  ceasing_operations:  { target: "IT Asset Manager",          context: "Operations ceasing — all equipment needs disposition" },
  office_closure:      { target: "Facilities Director",       context: "Office closing — secure equipment access before move-out" },
  facility_shutdown:   { target: "Facilities Director",       context: "Facility shutting down — building being vacated" },
  shutdown:            { target: "Facilities Director",       context: "Site shutdown — equipment disposition imminent" },
  plant_closing:       { target: "Plant Manager",             context: "Plant closing — manufacturing + IT assets in play" },
  layoff:              { target: "VP of IT",                   context: "Headcount reduction — surplus assets from departed staff" },
  bankruptcy_ch11:     { target: "CFO's Office",              context: "Ch. 11 restructuring — may divest non-core assets" },
  restructuring:       { target: "VP of IT",                   context: "Restructuring — consolidation creates surplus" },
  merger:              { target: "Integration Lead",           context: "M&A in progress — redundant assets post-close" },
  acquisition:         { target: "Integration Lead",           context: "Acquisition closing — duplicate infrastructure coming" },
  relocation:          { target: "IT / Facilities Director",   context: "Relocation planned — equipment refresh deal" },
};

// Priority order — first match wins
const TYPE_PRIORITY = [
  "bankruptcy_ch7", "liquidation", "ceasing_operations",
  "office_closure", "facility_shutdown", "shutdown",
  "plant_closing", "layoff", "bankruptcy_ch11", "restructuring",
  "merger", "acquisition", "relocation",
];

function pickVerb(disposition: string, dealScore: number): string {
  if (disposition === "Immediate" || dealScore >= 85) return "Call";
  if (disposition === "2-4 weeks" || dealScore >= 70) return "Contact";
  if (disposition === "1-3 months") return "Email";
  return "Monitor";
}

function urgencyColor(disposition: string): string {
  switch (disposition) {
    case "Immediate":  return "var(--critical)";
    case "2-4 weeks":  return "var(--high)";
    case "1-3 months": return "var(--medium)";
    default:           return "var(--text-muted)";
  }
}

function deviceContext(assets: number): string {
  if (assets >= 5000) return `${assets.toLocaleString()} assets — enterprise-scale deal`;
  if (assets >= 1000) return `${assets.toLocaleString()} assets in play`;
  return `~${assets.toLocaleString()} assets estimated`;
}

export function getNextAction(opp: Opportunity): NextAction {
  // Find the most urgent signal type
  const primary = TYPE_PRIORITY.find((t) => opp.signal_types.includes(t));
  const entry = primary ? CONTACT_MAP[primary] : null;

  const verb = pickVerb(opp.disposition_window, opp.deal_score);
  const target = entry?.target ?? "IT Decision-Maker";
  const eventReason = entry?.context ?? "Distress signals detected";
  const assets = deviceContext(opp.total_device_estimate);

  // Build a tight reason: event context + device scale
  const reason = `${eventReason}. ${assets}.`;

  return { verb, target, reason, urgencyColor: urgencyColor(opp.disposition_window) };
}

export function NextActionBar({ opportunity }: { opportunity: Opportunity }) {
  const action = getNextAction(opportunity);

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md mt-2.5"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      {/* Verb pill */}
      <span
        className="shrink-0 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
        style={{ backgroundColor: action.urgencyColor, color: "#fff" }}
      >
        {action.verb}
      </span>

      {/* Target + reason */}
      <span className="text-xs leading-snug min-w-0">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {action.target}
        </span>
        <span style={{ color: "var(--text-muted)" }}> — {action.reason}</span>
      </span>
    </div>
  );
}
