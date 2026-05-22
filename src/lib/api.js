import axios from 'axios';

axios.defaults.adapter = 'fetch';

const API_BASE = "";

async function fetchAPI(endpoint, options = {}) {
  try {
    const config = {
      url: `${API_BASE}${endpoint}`,
      method: options.method || "GET",
      headers: options.headers || {},
      data: options.body ? JSON.parse(options.body) : undefined,
    };
    const res = await axios(config);
    return res.data;
  } catch (error) {
    const data = error.response?.data || { error: "Request failed" };
    throw new Error(data.error || "Request failed");
  }
}

export async function getLogs(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.event_type) searchParams.set("event_type", params.event_type);
  if (params.search) searchParams.set("search", params.search);
  if (params.domain) searchParams.set("domain", params.domain);
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);

  return fetchAPI(`/api/v1/logs?${searchParams.toString()}`);
}

export async function getStats(domain) {
  const params = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  return fetchAPI(`/api/v1/stats${params}`);
}

export async function getHealth() {
  return fetchAPI("/api/v1/health");
}

export async function queryAI(question, domain) {
  return fetchAPI("/api/v1/query", {
    method: "POST",
    body: JSON.stringify({ question, domain }),
  });
}

export async function seedData() {
  return fetchAPI("/api/v1/seed", { method: "POST" });
}

export async function clearData(action) {
  return fetchAPI("/api/v1/clear", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function analyzeWebsite(url, maxPages = 15) {
  return fetchAPI("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify({ url, maxPages }),
  });
}

// ===== ALERTS API =====

export async function getAlerts() {
  return fetchAPI("/api/v1/alerts");
}

export async function createAlert(data) {
  return fetchAPI("/api/v1/alerts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAlert(id, data) {
  return fetchAPI(`/api/v1/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAlert(id) {
  return fetchAPI(`/api/v1/alerts/${id}`, { method: "DELETE" });
}

export async function getAlertHistory() {
  return fetchAPI("/api/v1/alerts/history");
}

export async function checkAlerts() {
  return fetchAPI("/api/v1/alerts/check", { method: "POST" });
}
