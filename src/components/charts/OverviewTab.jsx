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

const PIE_COLORS = ["#2563EB", "#22C55E", "#EF4444", "#F59E0B", "#3B82F6", "#06B6D4"];

export default function OverviewTab({ stats, tooltipStyle }) {
  if (!stats) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="two-col">
        {/* Event Types Pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Event Type Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.event_type_breakdown.map((e) => ({
                  name: e.type.replace("_", " "),
                  value: e.count,
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {stats.event_type_breakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top URLs Bar */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top URLs by Visits</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.top_urls}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="url"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Bar
                dataKey="count"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events over time */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Events Over Time (24h)</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats.events_per_hour}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.split(" ")[1] || v}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#2563EB" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
