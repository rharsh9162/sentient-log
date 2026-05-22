import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ErrorsTab({ stats, tooltipStyle }) {
  if (!stats) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="kpi-card">
          <div className="kpi-icon red">
            <AlertCircleIcon />
          </div>
          <div>
            <p className="kpi-label">Total Errors</p>
            <p className="kpi-value">{stats.error_count}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon amber">
            <PercentIcon />
          </div>
          <div>
            <p className="kpi-label">Error Rate</p>
            <p className="kpi-value">
              {stats.total_events > 0
                ? ((stats.error_count / stats.total_events) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon indigo">
            <TotalIcon />
          </div>
          <div>
            <p className="kpi-label">Total Events</p>
            <p className="kpi-value">
              {stats.total_events.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Error vs Non-Error Events</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={[
                { name: "Errors", value: stats.error_count },
                {
                  name: "Others",
                  value: stats.total_events - stats.error_count,
                },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#EF4444" />
              <Cell fill="#22C55E" />
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#475569" }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Inline mini icons for the errors tab KPI
function AlertCircleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
