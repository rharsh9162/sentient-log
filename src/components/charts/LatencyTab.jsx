import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function LatencyTab({ stats, tooltipStyle }) {
  if (!stats) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Average Latency by URL</h3>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={stats.avg_latency_per_url} layout="vertical">
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
              unit="ms"
            />
            <YAxis
              type="category"
              dataKey="url"
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [`${value}ms`, "Avg Latency"]}
            />

            <Bar
              dataKey="avg_latency"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {stats.avg_latency_per_url.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.avg_latency > 500
                      ? "#EF4444"
                      : entry.avg_latency > 300
                        ? "#F59E0B"
                        : "#22C55E"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
