"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { SkeletonChart } from "@/components/ui/Skeleton";  // loading placeholder while data is being fetched
import { useSocket } from "@/components/providers/SocketProvider";  // gives access to the shared Socket.IO connection
import OverviewTab from "@/components/charts/OverviewTab";
import LatencyTab from "@/components/charts/LatencyTab";
import ErrorsTab from "@/components/charts/ErrorsTab";
import PageHeader from "@/components/shared/PageHeader";

export default function ChartsPage() {
  const [stats, setStats] = useState(null);  // holds the fetched analytics data
  const [loading, setLoading] = useState(true);  // tracks whether stats are being fetched
  const [activeTab, setActiveTab] = useState("overview");  // controls which chart section is visible
  const [domain, setDomain] = useState("");  // stores the currently selected domain filter

  const { socket } = useSocket();  // This pulls the Socket.IO client out of the app-wide socket provider

  const fetchData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    axios.get("/api/v1/stats", { params: domain ? { domain } : {} })
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => {
        if (!silent) setLoading(false);
      });
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
        fetchData(true);
      }, 3000); // Debounce 3s to avoid hammering DB
    };

    socket.on("event:new", handleNewEvent);
    //Whenever the socket receives an "event:new" message, the page waits 3 seconds and then refetches stats
    return () => {
      socket.off("event:new", handleNewEvent);  // on cleanup , remove the socket listener 
      if (debounce) clearTimeout(debounce);  // and clear the timer 
    };
  }, [socket, fetchData]);

  /*
      The socket is used only as a live-update trigger, not as the source of chart data.
      So the socket acts like a notification:
          new event arrives -> socket emits "event:new" -> page refetches /api/v1/stats
      Without the socket, the charts still work, but they update only when the page loads or the domain filter changes. You can remove the socket code if live chart refresh is not needed.
  */


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
