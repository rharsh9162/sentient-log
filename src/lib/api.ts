const API_BASE = '';

interface LogParams {
  page?: number;
  limit?: number;
  event_type?: string;
  search?: string;
  domain?: string;
  start_date?: string;
  end_date?: string;
}

interface LogEvent {
  _id: string;
  event_type: string;
  url: string;
  latency_ms: number;
  status_code?: number;
  metadata?: Record<string, unknown>;
  session_id?: string;
  timestamp: string;
}

interface LogsResponse {
  events: LogEvent[];
  total: number;
  page: number;
  pages: number;
}

interface StatsResponse {
  total_events: number;
  avg_latency: number;
  error_count: number;
  unique_urls: number;
  events_per_hour: { hour: string; count: number }[];
  top_urls: { url: string; count: number }[];
  event_type_breakdown: { type: string; count: number }[];
  avg_latency_per_url: { url: string; avg_latency: number }[];
  domains: string[];
}

interface HealthResponse {
  status: string;
  db: string;
  buffer_size: number;
  uptime_seconds: number;
}

interface QueryResponse {
  question: string;
  pipeline: object[];
  results: Record<string, unknown>[];
  summary: string;
}

export async function getLogs(params: LogParams = {}): Promise<LogsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.event_type) searchParams.set('event_type', params.event_type);
  if (params.search) searchParams.set('search', params.search);
  if (params.domain) searchParams.set('domain', params.domain);
  if (params.start_date) searchParams.set('start_date', params.start_date);
  if (params.end_date) searchParams.set('end_date', params.end_date);

  const res = await fetch(`${API_BASE}/api/v1/logs?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function getStats(domain?: string): Promise<StatsResponse> {
  const params = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  const res = await fetch(`${API_BASE}/api/v1/stats${params}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function queryAI(question: string, domain?: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, domain }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Query failed');
  }
  return res.json();
}

export async function seedData(): Promise<{ message: string; count: number }> {
  const res = await fetch(`${API_BASE}/api/v1/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to seed data');
  return res.json();
}

export async function clearData(action: 'clear_orphaned' | 'clear_mine' | 'clear_all'): Promise<{ message: string; deleted: number }> {
  const res = await fetch(`${API_BASE}/api/v1/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to clear data');
  return res.json();
}

export interface AnalyzeResult {
  url: string;
  status: number;
  latency: string;
  title: string;
  links: number;
  error?: string;
}

export interface AnalyzeResponse {
  message: string;
  domain: string;
  pages_crawled: number;
  events_created: number;
  session_id: string;
  results: AnalyzeResult[];
  summary: {
    avg_latency: number;
    errors: number;
    fastest: number;
    slowest: number;
  };
}

export async function analyzeWebsite(url: string, maxPages: number = 15): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, maxPages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Analysis failed');
  }
  return res.json();
}

export type { LogEvent, LogsResponse, StatsResponse, HealthResponse, QueryResponse };

// ===== ALERTS API =====

export interface AlertRule {
  _id: string;
  user_id: string;
  name: string;
  domain: string;
  metric: 'avg_latency' | 'error_rate' | 'slow_pages' | 'total_errors';
  condition: 'gt' | 'lt';
  threshold: number;
  frequency: '15m' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  last_fired_at: string | null;
  total_firings: number;
  createdAt: string;
}

export interface AlertSummary {
  total_rules: number;
  active: number;
  fired_today: number;
  total_firings: number;
}

export interface AlertHistoryItem {
  _id: string;
  alert_id: string;
  user_id: string;
  rule_name: string;
  domain: string;
  metric: string;
  measured_value: number;
  threshold: number;
  fired_at: string;
}

export async function getAlerts(): Promise<{ alerts: AlertRule[]; summary: AlertSummary }> {
  const res = await fetch(`${API_BASE}/api/v1/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function createAlert(data: {
  name: string;
  domain: string;
  metric: string;
  condition: string;
  threshold: number;
  frequency: string;
}): Promise<{ alert: AlertRule; message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(d.error || 'Failed to create alert');
  }
  return res.json();
}

export async function updateAlert(
  id: string,
  data: Partial<AlertRule>
): Promise<{ alert: AlertRule }> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

export async function deleteAlert(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete alert');
  return res.json();
}

export async function getAlertHistory(): Promise<{ history: AlertHistoryItem[] }> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/history`);
  if (!res.ok) throw new Error('Failed to fetch alert history');
  return res.json();
}

export async function checkAlerts(): Promise<{
  checked: number;
  fired: number;
  results: { name: string; fired: boolean; reason: string }[];
}> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/check`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to check alerts');
  return res.json();
}

