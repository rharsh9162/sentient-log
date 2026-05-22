"use client";

import { useEffect, useState, useCallback } from "react";
import { getStats } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Filter } from "lucide-react";

const PIE_COLORS = [
  "#6366F1",
  "#22C55E",
  "#EF4444",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
];

import OverviewTab from "@/components/charts/OverviewTab";
import LatencyTab from "@/components/charts/LatencyTab";
import ErrorsTab from "@/components/charts/ErrorsTab";

export default function ChartsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [domain, setDomain] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    getStats(domain || undefined)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [domain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "latency", label: "Latency" },
    { key: "errors", label: "Errors" },
  ];

  const tooltipStyle = {
    contentStyle: {
      background: "rgba(255,255,255,0.9)",
      border: "1px solid #E2E8F0",
      borderRadius: 8,
      fontSize: 13,
      backdropFilter: "blur(10px)",
    },
    labelStyle: { color: "#475569" },
    itemStyle: { color: "#7C3AED" },
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Charts</h1>
          <p className="page-subtitle">Visual analytics of your event data</p>
        </div>
        <div className="spinner-page">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
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
          <h1 className="page-title">Charts</h1>
          <p className="page-subtitle">
            {domain
              ? `Showing data for ${domain}`
              : "Visual analytics of your event data"}
          </p>
        </div>
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

      {/* Tabs */}
      <div className="chart-tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`chart-tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!stats || stats.total_events === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "#64748B", fontSize: 15 }}>
            No event data available. Seed some data from the Overview page.
          </p>
        </div>
      ) : (
        <>
          {activeTab === "overview" && <OverviewTab stats={stats} tooltipStyle={tooltipStyle} />}
          {activeTab === "latency" && <LatencyTab stats={stats} tooltipStyle={tooltipStyle} />}
          {activeTab === "errors" && <ErrorsTab stats={stats} tooltipStyle={tooltipStyle} />}
        </>
      )}
    </div>
  );
}
