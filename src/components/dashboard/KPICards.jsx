import { Activity, Timer, AlertCircle, Globe } from "lucide-react";

export default function KPICards({ stats, loading }) {
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
  );
}
