import { createClient } from "./supabase";

// API calls use relative URLs — Next.js rewrites proxy them to the backend.
// This eliminates CORS issues since browser only talks to the same origin.
const API_URL = "";

export class PlanLimitError extends Error {
  feature: string;
  currentPlan: string;

  constructor(feature: string, currentPlan: string, message: string) {
    super(message);
    this.name = "PlanLimitError";
    this.feature = feature;
    this.currentPlan = currentPlan;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 402 && error.detail?.error === "plan_limit_exceeded") {
      throw new PlanLimitError(
        error.detail.feature,
        error.detail.current_plan,
        error.detail.message,
      );
    }
    throw new Error(error.detail?.message || error.detail || "API error");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Dashboard
  getStats: () => apiFetch<DashboardResponse>("/dashboard/stats"),
  getPipelineHealth: () => apiFetch<PipelineHealthItem[]>("/dashboard/pipeline-health"),

  // Signals
  getSignals: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<SignalListResponse>(`/signals${qs}`);
  },
  getSignal: (id: string) => apiFetch<Signal>(`/signals/${id}`),
  getSignalAnalysis: (id: string) =>
    apiFetch<SignalAnalysis>(`/signals/${id}/analysis`),

  // Companies
  getCompanies: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<CompanyListResponse>(`/companies${qs}`);
  },
  getCompany: (id: string) => apiFetch<Company>(`/companies/${id}`),
  getCompanySignals: (id: string) => apiFetch<Signal[]>(`/companies/${id}/signals`),

  // Opportunities
  getOpportunities: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<OpportunityListResponse>(`/opportunities${qs}`);
  },
  getOpportunity: (companyId: string) =>
    apiFetch<OpportunityDetail>(`/opportunities/${companyId}`),
  getCommandCenterStats: () =>
    apiFetch<CommandCenterStats>("/opportunities/stats"),
  exportOpportunitiesCSV: async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/opportunities/export/csv`, { headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      if (res.status === 402 && error.detail?.error === "plan_limit_exceeded") {
        throw new PlanLimitError(error.detail.feature, error.detail.current_plan, error.detail.message);
      }
      throw new Error(error.detail?.message || error.detail || "Export failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opportunities.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  // Revenue Settings
  getRevenueSettings: () => apiFetch<RevenueSettings>("/settings/revenue"),
  updateRevenueSettings: (pricePerDevice: number) =>
    apiFetch<RevenueSettings>("/settings/revenue", {
      method: "PUT",
      body: JSON.stringify({ price_per_device: pricePerDevice }),
    }),

  // Gap Detection
  getOpportunityGaps: (limit?: number) =>
    apiFetch<GapDetectionResponse>(`/opportunities/gaps?limit=${limit || 5}`),
  getGapPreferences: () => apiFetch<GapPreferences>("/settings/preferences"),
  updateGapPreferences: (prefs: GapPreferences) =>
    apiFetch<GapPreferences>("/settings/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),

  // Watchlists / Pipeline
  getWatchlist: () => apiFetch<WatchlistItem[]>("/watchlists"),
  addToWatchlist: (companyId: string, notes?: string) =>
    apiFetch<WatchlistItem>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, notes }),
    }),
  removeFromWatchlist: (id: string) =>
    apiFetch<void>(`/watchlists/${id}`, { method: "DELETE" }),
  claimLead: (id: string) =>
    apiFetch<WatchlistItem>(`/watchlists/${id}/claim`, { method: "PUT" }),
  updateLeadStatus: (id: string, status: string, lostReason?: string) =>
    apiFetch<WatchlistItem>(`/watchlists/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, lost_reason: lostReason }),
    }),
  updateLeadPriority: (id: string, priority: string) =>
    apiFetch<WatchlistItem>(`/watchlists/${id}/priority`, {
      method: "PUT",
      body: JSON.stringify({ priority }),
    }),
  updateFollowUp: (id: string, followUpAt: string | null) =>
    apiFetch<WatchlistItem>(`/watchlists/${id}/follow-up`, {
      method: "PUT",
      body: JSON.stringify({ follow_up_at: followUpAt }),
    }),
  addActivity: (id: string, data: { activity_type: string; title: string; body?: string }) =>
    apiFetch<PipelineActivity>(`/watchlists/${id}/activities`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getActivities: (id: string) =>
    apiFetch<PipelineActivity[]>(`/watchlists/${id}/activities`),
  getFollowUps: () => apiFetch<FollowUpItem[]>("/watchlists/follow-ups"),
  getPipelineSummary: () => apiFetch<PipelineSummary>("/watchlists/summary"),
  getMyPipeline: () => apiFetch<WatchlistItem[]>("/watchlists/my-pipeline"),
  getTeamPipeline: () => apiFetch<WatchlistItem[]>("/watchlists/team-pipeline"),

  // Alerts
  getAlerts: () => apiFetch<Alert[]>("/alerts"),
  createAlert: (data: AlertCreate) =>
    apiFetch<Alert>("/alerts", { method: "POST", body: JSON.stringify(data) }),
  updateAlert: (id: string, data: Partial<Alert>) =>
    apiFetch<Alert>(`/alerts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAlert: (id: string) => apiFetch<void>(`/alerts/${id}`, { method: "DELETE" }),

  // Billing
  createCheckout: (priceId?: string) =>
    apiFetch<{ client_secret: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ price_id: priceId }),
    }),
  subscribe: (priceId?: string) =>
    apiFetch<{ client_secret: string; subscription_id: string }>("/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ price_id: priceId }),
    }),
  getPortal: () => apiFetch<{ portal_url: string }>("/billing/portal"),

  // Contacts
  findContacts: (companyId: string) =>
    apiFetch<ContactsResponse>(`/contacts/${companyId}/find`, { method: "POST" }),
  getContacts: (companyId: string) =>
    apiFetch<ContactsResponse>(`/contacts/${companyId}`),

  // Pipelines
  checkNewSignals: (since: string) =>
    apiFetch<{ new_count: number; latest_at: string | null }>(
      `/pipelines/new-signals?since=${encodeURIComponent(since)}`
    ),
  triggerPipelineRun: () =>
    apiFetch<Record<string, unknown>>("/pipelines/run", { method: "POST" }),

  // Admin
  runSecurityAudit: () => apiFetch<SecurityReport>("/admin/security-audit"),
  getAuditHistory: () => apiFetch<AuditHistoryItem[]>("/admin/security-audit/history"),

  // Auth
  getMe: () => apiFetch<UserProfile>("/auth/me"),
  authCallback: (data: { email: string; full_name?: string; company_name?: string; job_title?: string; referral_source?: string; organization_type?: string; primary_goal?: string }) =>
    apiFetch<AuthCallbackResponse>("/auth/callback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProfile: (data: { full_name?: string; company_name?: string; job_title?: string; referral_source?: string; organization_type?: string; primary_goal?: string }) =>
    apiFetch<{ id: string; full_name: string | null; company_name: string | null; job_title: string | null; referral_source: string | null; organization_type: string | null; primary_goal: string | null }>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Types
export interface Signal {
  id: string;
  company_id: string;
  signal_type: string;
  signal_category: string;
  title: string;
  summary: string | null;
  confidence_score: number;
  severity_score: number;
  source_name: string;
  source_url: string | null;
  source_published_at: string | null;
  location_city: string | null;
  location_state: string | null;
  affected_employees: number | null;
  device_estimate: number | null;
  correlation_group_id: string | null;
  created_at: string;
  company_name: string | null;
}

export interface SignalListResponse {
  signals: Signal[];
  total: number;
  page: number;
  per_page: number;
}

export interface SignalSource {
  name: string;
  url: string | null;
  signal_type: string;
  title: string;
}

export interface SignalAnalysis {
  event_breakdown: string;
  asset_impact: string;
  company_context: string;
  asset_opportunity: string;
  opportunity_score: number;
  recommended_actions: string[];
  likely_asset_types: AssetType[];
  correlated_signals_summary: string | null;
  sources: SignalSource[];
  generated_at: string;
  cached: boolean;
}

export interface Company {
  id: string;
  name: string;
  normalized_name: string;
  ticker: string | null;
  industry: string | null;
  headquarters_city: string | null;
  headquarters_state: string | null;
  composite_risk_score: number;
  signal_count: number;
  last_signal_at: string | null;
  risk_trend: string;
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  per_page: number;
}

export interface WatchlistItem {
  id: string;
  company_id: string;
  notes: string | null;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  priority: string;
  follow_up_at: string | null;
  last_activity_at: string | null;
  closed_at: string | null;
  lost_reason: string | null;
  company_name: string | null;
  composite_risk_score: number | null;
  deal_score: number | null;
  claimed_by_name: string | null;
  activity_count: number;
}

export interface Alert {
  id: string;
  alert_type: string;
  signal_types: string[];
  min_confidence_score: number;
  min_severity_score: number;
  states: string[];
  watchlist_only: boolean;
  delivery_method: string;
  frequency: string;
  is_active: boolean;
  created_at: string;
}

export interface AlertCreate {
  alert_type: string;
  signal_types?: string[];
  min_confidence_score?: number;
  min_severity_score?: number;
  states?: string[];
  company_ids?: string[];
  watchlist_only?: boolean;
  delivery_method?: string;
  frequency?: string;
}

export interface DashboardResponse {
  stats: {
    signals_today: number;
    high_risk_companies: number;
    watchlist_count: number;
    active_alerts: number;
  };
  recent_signals: Signal[];
}

export interface PipelineHealthItem {
  name: string;
  source_type: string;
  is_enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_signals_count: number;
  error_count: number;
}

export interface PlanLimitsInfo {
  max_watchlist_companies: number;
  max_active_alerts: number;
  max_signal_analyses_per_day: number | null;
  allowed_alert_frequencies: string[];
  signal_history_days: number | null;
  score_breakdown_mode: string;
  csv_export: boolean;
  team_pipeline: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  job_title: string | null;
  referral_source: string | null;
  organization_type: string | null;
  primary_goal: string | null;
  role: string;
  tenant_id: string;
  tenant_name: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  plan_limits?: PlanLimitsInfo;
}

export interface AuthCallbackResponse {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
}

// Asset type from AI analysis
export interface AssetType {
  category: string;
  examples: string;
  estimated_volume: string;
}

// Score breakdown types
export interface ScoreFactor {
  name: string;
  points: number;
  max_points: number;
  summary: string;
}

export interface ScoreBreakdown {
  factors: ScoreFactor[];
  top_factors: string[];
  band: string;
  band_label: string;
  penalty_applied: boolean;
  boost_applied: boolean;
}

// Opportunity types
export interface Opportunity {
  company_id: string;
  company_name: string;
  ticker: string | null;
  industry: string | null;
  headquarters_state: string | null;
  employee_count: number | null;
  composite_risk_score: number;
  risk_trend: string;
  deal_score: number;
  score_band: string;
  score_band_label: string;
  signal_count: number;
  total_device_estimate: number;
  revenue_estimate: number;
  latest_signal_at: string;
  disposition_window: string;
  signal_types: string[];
  source_names: string[];
  source_diversity: number;
  is_watched: boolean;
  top_factors: string[];
  has_contacts: boolean;
  contact_count: number;
  justification: string;
  predicted_phase: string;
  predicted_phase_label: string;
  phase_verb: string;
}

export interface OpportunityListResponse {
  opportunities: Opportunity[];
  total: number;
  page: number;
  per_page: number;
  total_pipeline_value: number;
  total_devices: number;
}

export interface OpportunityDetail extends Opportunity {
  signals: Signal[];
  avg_confidence: number;
  avg_severity: number;
  recommended_actions: string[] | null;
  asset_opportunity: string | null;
  likely_asset_types: AssetType[];
  score_breakdown: ScoreBreakdown | null;
  signal_velocity: number;
  domain: string | null;
  deal_justification: string | null;
  phase_explanation: string;
  phase_confidence: string;
  watchlist_id: string | null;
  watchlist_status: string | null;
  watchlist_priority: string | null;
  follow_up_at: string | null;
}

export interface RecentChange {
  company_id: string;
  company_name: string;
  signal_type: string;
  title: string;
  source_name: string;
  detected_at: string;
  device_estimate: number | null;
}

export interface CommandCenterStats {
  total_pipeline_value: number;
  pipeline_value_change_7d: number;
  new_opportunities_today: number;
  hot_opportunities: number;
  total_active_opportunities: number;
  total_devices_in_pipeline: number;
  watchlist_count: number;
  top_opportunities: Opportunity[];
  calls_to_make: number;
  contacts_to_make: number;
  recent_changes: RecentChange[];
}

export interface RevenueSettings {
  price_per_device: number;
}

export interface GapOpportunity {
  opportunity: Opportunity;
  gap_score: number;
  match_reasons: string[];
  is_new: boolean;
}

export interface TenantProfileSummary {
  states: string[];
  industries: string[];
  signal_types: string[];
  min_deal_score: number;
  is_explicit: boolean;
  watchlist_count: number;
}

export interface GapDetectionResponse {
  gaps: GapOpportunity[];
  profile: TenantProfileSummary;
  total_uncovered: number;
}

export interface GapPreferences {
  states: string[];
  industries: string[];
  signal_types: string[];
  min_deal_score: number;
}

// Contact types
export interface ContactInfo {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  title: string | null;
  seniority_level: string | null;
  decision_maker_score: number | null;
  email: string | null;
  email_status: string;
  phone: string | null;
  linkedin_url: string | null;
  discovery_source: string | null;
  created_at: string;
}

export interface ContactsResponse {
  contacts: ContactInfo[];
  company_id: string;
  company_name: string;
  status: "found" | "none_found" | "no_domain";
  total: number;
}

// Pipeline activity types
export interface PipelineActivity {
  id: string;
  watchlist_id: string;
  user_id: string;
  activity_type: string;
  title: string;
  body: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_name: string | null;
}

export interface FollowUpItem {
  watchlist_id: string;
  company_id: string;
  company_name: string | null;
  follow_up_at: string;
  status: string;
  priority: string;
  is_overdue: boolean;
  days_until: number;
  claimed_by_name: string | null;
}

export interface PipelineSummary {
  total: number;
  by_status: Record<string, number>;
  overdue_follow_ups: number;
  won_this_month: number;
  lost_this_month: number;
}

// Security audit types
export interface SecurityCheckResult {
  name: string;
  severity: string;
  status: string;
  message: string;
  details: string | null;
}

export interface SecurityReport {
  overall_status: string;
  run_at: string;
  checks: SecurityCheckResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}

export interface AuditHistoryItem {
  id: string;
  overall_status: string;
  checks: SecurityCheckResult[];
  created_at: string | null;
}
