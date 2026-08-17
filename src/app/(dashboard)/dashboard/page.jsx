"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { useSocket } from "@/components/providers/SocketProvider";
import PageHeader from "@/components/shared/PageHeader";
import KPICards from "@/components/dashboard/KPICards";
import OverviewTab from "@/components/charts/OverviewTab";

export default function OverviewPage() {
  const { userId } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/v1/stats", {
        params: domain ? { domain } : {},
      });
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
  }, [fetchStats]);

  // Live: refetch stats when new events come in (debounced)
  useEffect(() => {
    if (!socket) return;
    let debounce = null;

    const handleNewEvent = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        fetchStats();
      }, 3000); // Debounce 3s to avoid hammering DB
    };

    socket.on("event:new", handleNewEvent);
    return () => {
      socket.off("event:new", handleNewEvent);
      if (debounce) clearTimeout(debounce);
    };
  }, [socket, fetchStats]);

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
        title="Overview"
        subtitle="Your platform at a glance"
        domain={domain}
        setDomain={setDomain}
        domains={stats?.domains || []}
        userId={userId}
        showInsights={true}
      />

      <KPICards stats={stats} loading={loading} />

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
      ) : !stats || stats.total_events === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 80 }}>
          <p style={{ color: "#64748B", fontSize: 15 }}>
            No event data yet. Go to <strong>Analyze Site</strong> to crawl a
            real website.
          </p>
        </div>
      ) : (
        <OverviewTab stats={stats} tooltipStyle={tooltipStyle} />
      )}
    </div>
  );
}
