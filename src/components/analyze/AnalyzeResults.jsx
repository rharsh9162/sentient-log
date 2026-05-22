import { Globe, Clock, AlertTriangle, Zap, CheckCircle2, XCircle, ExternalLink, ArrowRight } from "lucide-react";

export default function AnalyzeResults({ result }) {
  if (!result) return null;

  const getStatusColor = (status) => {
    if (status === 0) return "#EF4444";
    if (status >= 500) return "#EF4444";
    if (status >= 400) return "#F59E0B";
    if (status >= 300) return "#60A5FA";
    return "#22C55E";
  };

  const getLatencyColor = (latency) => {
    const ms = parseInt(latency);
    if (ms > 2000) return "#EF4444";
    if (ms > 1000) return "#F59E0B";
    if (ms > 500) return "#60A5FA";
    return "#22C55E";
  };

  return (
    <>
      {/* Summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon indigo">
            <Globe size={22} />
          </div>
          <div>
            <p className="kpi-label">Pages Crawled</p>
            <p className="kpi-value">{result.pages_crawled}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green">
            <Clock size={22} />
          </div>
          <div>
            <p className="kpi-label">Avg Latency</p>
            <p className="kpi-value">{result.summary.avg_latency}ms</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="kpi-label">Errors</p>
            <p className="kpi-value">{result.summary.errors}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Zap size={22} />
          </div>
          <div>
            <p className="kpi-label">Events Created</p>
            <p className="kpi-value">{result.events_created}</p>
          </div>
        </div>
      </div>

      {/* Success message */}
      <div className="card" style={{ padding: 16, borderLeft: "3px solid #22C55E" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <CheckCircle2 size={18} style={{ color: "#10B981" }} />
            <span style={{ color: "#10B981", fontSize: 14, fontWeight: 500 }}>
              {result.message}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#64748B" }}>
            Fastest: {result.summary.fastest}ms · Slowest: {result.summary.slowest}ms
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#64748B", marginTop: 6, marginLeft: 28 }}>
          Data is now available in Overview, Logs, and Charts pages.
          <ArrowRight size={12} style={{ display: "inline", marginLeft: 4 }} />
        </p>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Crawl Results — {result.domain}</h3>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Title</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => (
                <tr key={i}>
                  <td>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#7C3AED",
                        textDecoration: "none",
                        fontSize: 12,
                        fontFamily: "monospace",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {new URL(r.url).pathname || "/"}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td
                    style={{
                      color: "#475569",
                      fontSize: 13,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.title || "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: getStatusColor(r.status),
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {r.status === 0 ? (
                        <XCircle size={13} />
                      ) : r.status >= 400 ? (
                        <AlertTriangle size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {r.status || "FAIL"}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        color: getLatencyColor(r.latency),
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                    >
                      {r.latency}
                    </span>
                  </td>
                  <td style={{ color: "#94A3B8", fontSize: 13 }}>{r.links}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
