import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    throw new Error(error.detail || "API error");
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

  // Companies
  getCompanies: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<CompanyListResponse>(`/companies${qs}`);
  },
  getCompany: (id: string) => apiFetch<Company>(`/companies/${id}`),
  getCompanySignals: (id: string) => apiFetch<Signal[]>(`/companies/${id}/signals`),

  // Watchlists
  getWatchlist: () => apiFetch<WatchlistItem[]>("/watchlists"),
  addToWatchlist: (companyId: string, notes?: string) =>
    apiFetch<WatchlistItem>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, notes }),
    }),
  removeFromWatchlist: (id: string) =>
    apiFetch<void>(`/watchlists/${id}`, { method: "DELETE" }),

  // Alerts
  getAlerts: () => apiFetch<Alert[]>("/alerts"),
  createAlert: (data: AlertCreate) =>
    apiFetch<Alert>("/alerts", { method: "POST", body: JSON.stringify(data) }),
  updateAlert: (id: string, data: Partial<Alert>) =>
    apiFetch<Alert>(`/alerts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAlert: (id: string) => apiFetch<void>(`/alerts/${id}`, { method: "DELETE" }),

  // Billing
  createCheckout: (priceId?: string) =>
    apiFetch<{ checkout_url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ price_id: priceId }),
    }),
  getPortal: () => apiFetch<{ portal_url: string }>("/billing/portal"),

  // Auth
  getMe: () => apiFetch<UserProfile>("/auth/me"),
  authCallback: (data: { email: string; full_name?: string }) =>
    apiFetch<AuthCallbackResponse>("/auth/callback", {
      method: "POST",
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
  created_at: string;
  company_name: string | null;
  composite_risk_score: number | null;
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
  watchlist_only?: boolean;
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

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tenant_id: string;
  tenant_name: string | null;
  plan: string | null;
}

export interface AuthCallbackResponse {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
}
