"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { Radio, Filter, Pause, Play, Trash2 } from "lucide-react";

export default function StreamPage() {
  const { socket, isConnected } = useSocket();
  const [events, setEvents] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState("");
  const feedRef = useRef(null);
  const isPausedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!socket) return;

    const handleNewEvent = (evt) => {
      if (isPausedRef.current) return;

      setEvents((prev) => {
        const updated = [evt, ...prev];
        if (updated.length > 200) updated.length = 200;
        return updated;
      });
    };

    socket.on("event:new", handleNewEvent);
    return () => socket.off("event:new", handleNewEvent);
  }, [socket]);

  const filteredEvents = filterType
    ? events.filter((e) => e.event_type === filterType)
    : events;

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getEventColor(type) {
    const colors = {
      page_view: "#2563EB",
      click: "#8B5CF6",
      error: "#EF4444",
      api_call: "#F59E0B",
    };
    return colors[type] || "#64748B";
  }

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title">Live Stream</h1>
            {isConnected && (
              <span className="live-dot-badge">
                <span className="live-dot" />
                Live
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Real-time event feed from all connected trackers
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Events</option>
            <option value="page_view">Page View</option>
            <option value="click">Click</option>
            <option value="error">Error</option>
            <option value="api_call">API Call</option>
          </select>

          <button
            className="export-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume stream" : "Pause stream"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? "Resume" : "Pause"}
          </button>

          <button
            className="export-btn"
            onClick={() => setEvents([])}
            title="Clear stream"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "#EF4444",
              borderColor: "rgba(239, 68, 68, 0.2)",
            }}
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Stream Feed */}
      <div className="stream-feed" ref={feedRef}>
        {filteredEvents.length === 0 ? (
          <div className="stream-empty">
            <Radio size={40} style={{ color: "#475569", opacity: 0.3 }} />
            <h3 style={{ color: "#64748B", fontWeight: 500, margin: "12px 0 4px" }}>
              {isConnected
                ? isPaused
                  ? "Stream paused"
                  : "Waiting for events..."
                : "Connecting to live stream..."}
            </h3>
            <p style={{ color: "#94A3B8", fontSize: 13 }}>
              {isConnected
                ? "Events will appear here in real-time as they are tracked."
                : "Establishing WebSocket connection..."}
            </p>
          </div>
        ) : (
          filteredEvents.map((evt, i) => (
            <div
              key={`${evt.timestamp}-${i}`}
              className="stream-card"
              style={{
                borderLeftColor: getEventColor(evt.event_type),
                animationDelay: `${i * 20}ms`,
              }}
            >
              <div className="stream-card-header">
                <span
                  className={`badge badge-${evt.event_type}`}
                  style={{ fontSize: 11, padding: "2px 8px" }}
                >
                  {evt.event_type.replace(/_/g, " ")}
                </span>
                <span className="stream-time">{formatTime(evt.timestamp)}</span>
              </div>

              <div className="stream-card-url">
                {evt.url
                  ? new URL(evt.url, "http://localhost").pathname
                  : "—"}
              </div>

              <div className="stream-card-meta">
                {evt.latency_ms > 0 && (
                  <span
                    style={{
                      color:
                        evt.latency_ms > 1000
                          ? "#EF4444"
                          : evt.latency_ms > 500
                            ? "#F59E0B"
                            : "#10B981",
                    }}
                  >
                    {evt.latency_ms}ms
                  </span>
                )}
                {evt.metadata?.device && (
                  <span style={{ color: "#64748B" }}>
                    {evt.metadata.device}
                  </span>
                )}
                {evt.metadata?.browser && (
                  <span style={{ color: "#64748B" }}>
                    {evt.metadata.browser}
                  </span>
                )}
                {evt.metadata?.message && (
                  <span
                    style={{
                      color: "#EF4444",
                      fontSize: 11,
                      maxWidth: 300,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {evt.metadata.message}
                  </span>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
