"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Timer, AlertCircle, Globe, Filter, Copy, Check } from "lucide-react";
import { getStats } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@clerk/nextjs";

export default function OverviewPage() {
  const { userId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats(domain || undefined);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const kpis = [
    {
      label: "Total Events",
      value: stats?.total_events?.toLocaleString() ?? "—",
      icon: Activity,
      color: "indigo",
    },
    {
      label: "Avg Latency",
      value: stats ? `${stats.avg_latency}ms` : "—",
      icon: Timer,
      color: "green",
    },
    {
      label: "Errors",
      value: stats?.error_count?.toLocaleString() ?? "—",
      icon: AlertCircle,
      color: "red",
    },
    {
      label: "Unique URLs",
      value: stats?.unique_urls?.toLocaleString() ?? "—",
      icon: Globe,
      color: "amber",
    },
  ];

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Header with domain filter */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Overview</h1>
            {userId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-api_call" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Account ID: <span style={{ fontFamily: 'monospace', marginLeft: '4px' }}>{userId}</span>
                </span>
                <button
                  onClick={handleCopyId}
                  title="Copy Account ID"
                  style={{
                    background: 'transparent',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#334155'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                >
                  {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
          <p className="page-subtitle">
            {domain
              ? `Showing data for ${domain}`
              : "Your platform at a glance"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stats?.domains && stats.domains.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Filter size={14} style={{ color: "#64748B" }} />
              <select
                className="filter-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <option value="">All Sources</option>
                {stats.domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div className="kpi-card" key={label}>
            <div className={`kpi-icon ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="kpi-label">{label}</p>
              {loading ? (
                <div className="kpi-skeleton" />
              ) : (
                <p className="kpi-value">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Events Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Events (Last 24h)</h3>
        </div>
        {loading ? (
          <div
            style={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="spinner" />
          </div>
        ) : stats && stats.events_per_hour.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.events_per_hour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#475569", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.split(" ")[1] || v}
              />

              <YAxis
                tick={{ fill: "#475569", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  fontSize: 13,
                  backdropFilter: "blur(10px)",
                }}
                labelStyle={{ color: "#475569" }}
                itemStyle={{ color: "#7C3AED" }}
              />

              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#2563EB" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p
            style={{
              color: "#64748B",
              fontSize: 14,
              textAlign: "center",
              padding: 40,
            }}
          >
            No event data yet. Go to <strong>Analyze Site</strong> to crawl a
            real website.
          </p>
        )}
      </div>

      {/* Bottom row */}
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top URLs</h3>
          </div>
          {loading ? (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="spinner" />
            </div>
          ) : stats && stats.top_urls.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.top_urls} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#475569", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="url"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    fontSize: 13,
                    backdropFilter: "blur(10px)",
                  }}
                  labelStyle={{ color: "#475569" }}
                  itemStyle={{ color: "#7C3AED" }}
                />

                <Bar
                  dataKey="count"
                  fill="#2563EB"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p
              style={{
                color: "#64748B",
                fontSize: 14,
                textAlign: "center",
                padding: 40,
              }}
            >
              No data
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Event Types</h3>
          </div>
          {loading ? (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="spinner" />
            </div>
          ) : stats && stats.event_type_breakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {stats.event_type_breakdown.map(({ type, count }) => {
                const max = Math.max(
                  ...stats.event_type_breakdown.map((e) => e.count),
                );
                const pct = (count / max) * 100;
                const colors = {
                  page_view: "#2563EB",
                  click: "#22C55E",
                  error: "#EF4444",
                  api_call: "#F59E0B",
                };
                return (
                  <div key={type}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span className={`badge badge-${type}`}>
                        {type.replace("_", " ")}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#475569",
                          fontWeight: 500,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "#E2E8F0",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: colors[type] || "#64748B",
                          borderRadius: 3,
                          transition: "width 0.6s ease-out",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                color: "#64748B",
                fontSize: 14,
                textAlign: "center",
                padding: 40,
              }}
            >
              No data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
