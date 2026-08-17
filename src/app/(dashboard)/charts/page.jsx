"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { useSocket } from "@/components/providers/SocketProvider";
import OverviewTab from "@/components/charts/OverviewTab";
import LatencyTab from "@/components/charts/LatencyTab";
import ErrorsTab from "@/components/charts/ErrorsTab";
import PageHeader from "@/components/shared/PageHeader";

export default function ChartsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [domain, setDomain] = useState("");

  const { socket } = useSocket();

  const fetchData = useCallback(() => {
    setLoading(true);
    axios.get("/api/v1/stats", { params: domain ? { domain } : {} })
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [domain]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live: refetch stats when new events come in (debounced)
  useEffect(() => {
    if (!socket) return;
    let debounce = null;

    const handleNewEvent = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        fetchData();
      }, 3000); // Debounce 3s to avoid hammering DB
    };

    socket.on("event:new", handleNewEvent);
    return () => {
      socket.off("event:new", handleNewEvent);
      if (debounce) clearTimeout(debounce);
    };
  }, [socket, fetchData]);

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

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader 
        title="Charts"
        subtitle="Visual analytics of your event data"
        domain={domain}
        setDomain={setDomain}
        domains={stats?.domains || []}
      />

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

      {loading ? (
        <SkeletonChart />
      ) : !stats || stats.total_events === 0 ? (
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
