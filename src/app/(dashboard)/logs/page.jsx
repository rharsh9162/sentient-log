"use client";

import React, { useEffect, useState, useCallback, Fragment } from "react";
import { getLogs, getStats } from "@/lib/api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
} from "lucide-react";

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const limit = 20;

  // Fetch available domains once
  useEffect(() => {
    getStats()
      .then((s) => setDomains(s.domains || []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLogs({
        page,
        limit,
        event_type: eventType || undefined,
        search: search || undefined,
        domain: domain || undefined,
      });
      setEvents(data.events);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, search, domain]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const exportCSV = () => {
    if (events.length === 0) return;
    const headers = [
      "Timestamp",
      "Type",
      "URL",
      "Latency (ms)",
      "Status Code",
      "Source/Domain",
    ];
    const rows = events.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.event_type,
      `"${(event.url || "").replace(/"/g, '""')}"`,
      event.latency_ms,
      event.status_code || "",
      event.metadata?.domain || event.metadata?.source || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentientlog-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div className="page-header">
        <h1 className="page-title">Log Explorer</h1>
        <p className="page-subtitle">
          {domain ? `Filtered: ${domain}` : "Browse and filter your event logs"}
        </p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        {domains.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} style={{ color: "#64748B" }} />
            <select
              className="filter-select"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Sources</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        <select
          className="filter-select"
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Events</option>
          <option value="page_view">Page View</option>
          <option value="click">Click</option>
          <option value="error">Error</option>
          <option value="api_call">API Call</option>
        </select>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={15}
              style={{ position: "absolute", left: 12, color: "#64748B" }}
            />
            <input
              className="filter-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search URLs..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </form>

        <button
          className="export-btn"
          onClick={exportCSV}
          disabled={loading || events.length === 0}
          title="Export current logs as CSV"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-page">
          <div className="spinner" />
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "#64748B", fontSize: 15 }}>
            No events found. Try adjusting your filters or analyze a website
            first.
          </p>
        </div>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>URL</th>
                  <th>Latency</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <React.Fragment key={event._id}>
                    <tr
                      onClick={() =>
                        setExpandedId(
                          expandedId === event._id ? null : event._id,
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td>{formatTime(event.timestamp)}</td>
                      <td>
                        <span className={`badge badge-${event.event_type}`}>
                          {event.event_type.replace("_", " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          color: "#1E293B",
                          fontFamily: "monospace",
                          fontSize: 12,
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.url}
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              event.latency_ms > 1000
                                ? "#EF4444"
                                : event.latency_ms > 500
                                  ? "#F59E0B"
                                  : "#10B981",
                          }}
                        >
                          {event.latency_ms}ms
                        </span>
                      </td>
                      <td>
                        {event.status_code ? (
                          <span
                            style={{
                              color:
                                event.status_code >= 400
                                  ? "#EF4444"
                                  : "#10B981",
                            }}
                          >
                            {event.status_code}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: "#64748B" }}>
                        {event.metadata?.domain ||
                          event.metadata?.source ||
                          "—"}
                      </td>
                    </tr>
                    {expandedId === event._id && (
                      <tr key={`${event._id}-detail`}>
                        <td
                          colSpan={6}
                          style={{
                            padding: "16px 20px",
                            background: "rgba(255,255,255,0.5)",
                            borderBottom: "1px solid rgba(226,232,240,0.8)",
                          }}
                        >
                          <div style={{ fontSize: 12, color: "#475569" }}>
                            <strong style={{ color: "#1E293B" }}>
                              Metadata:
                            </strong>
                            <pre
                              style={{
                                marginTop: 6,
                                color: "#7C3AED",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
              of {total}
            </span>
            <div className="pagination-btns">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ padding: "8px 12px", fontSize: 13 }}>
                Page {page} of {pages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
