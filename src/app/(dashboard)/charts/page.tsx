'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStats, type StatsResponse } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Filter } from 'lucide-react';

type TabKey = 'overview' | 'latency' | 'errors';

const PIE_COLORS = ['#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4'];

export default function ChartsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [domain, setDomain] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    getStats(domain || undefined)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [domain]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'latency', label: 'Latency' },
    { key: 'errors', label: 'Errors' },
  ];

  const tooltipStyle = {
    contentStyle: { background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backdropFilter: 'blur(10px)' },
    labelStyle: { color: '#475569' },
    itemStyle: { color: '#7C3AED' },
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Charts</h1>
          <p className="page-subtitle">Visual analytics of your event data</p>
        </div>
        <div className="spinner-page"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Charts</h1>
          <p className="page-subtitle">{domain ? `Showing data for ${domain}` : 'Visual analytics of your event data'}</p>
        </div>
        {stats?.domains && stats.domains.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: '#64748B' }} />
            <select
              className="filter-select"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="">All Sources</option>
              {stats.domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="chart-tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`chart-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!stats || stats.total_events === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 80 }}>
          <p style={{ color: '#64748B', fontSize: 15 }}>No event data available. Seed some data from the Overview page.</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="two-col">
                {/* Event Types Pie */}
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Event Type Distribution</h3></div>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={stats.event_type_breakdown.map(e => ({ name: e.type.replace('_', ' '), value: e.count }))}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100}
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
                        wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top URLs Bar */}
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Top URLs by Visits</h3></div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.top_urls}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="url" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Events over time */}
              <div className="card">
                <div className="card-header"><h3 className="card-title">Events Over Time (24h)</h3></div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.events_per_hour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => v.split(' ')[1] || v}
                    />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366F1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Latency Tab */}
          {activeTab === 'latency' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Average Latency by URL</h3></div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stats.avg_latency_per_url} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
                    <YAxis type="category" dataKey="url" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: unknown) => [`${value as number}ms`, 'Avg Latency']}
                    />
                    <Bar dataKey="avg_latency" radius={[0, 4, 4, 0]} barSize={20}>
                      {stats.avg_latency_per_url.map((entry, i) => (
                        <Cell key={i} fill={entry.avg_latency > 500 ? '#EF4444' : entry.avg_latency > 300 ? '#F59E0B' : '#22C55E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card">
                  <div className="kpi-icon red"><AlertCircleIcon /></div>
                  <div>
                    <p className="kpi-label">Total Errors</p>
                    <p className="kpi-value">{stats.error_count}</p>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon amber"><PercentIcon /></div>
                  <div>
                    <p className="kpi-label">Error Rate</p>
                    <p className="kpi-value">{stats.total_events > 0 ? ((stats.error_count / stats.total_events) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon indigo"><TotalIcon /></div>
                  <div>
                    <p className="kpi-label">Total Events</p>
                    <p className="kpi-value">{stats.total_events.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Error vs Non-Error Events</h3></div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Errors', value: stats.error_count },
                        { name: 'Others', value: stats.total_events - stats.error_count },
                      ]}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#EF4444" />
                      <Cell fill="#22C55E" />
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline mini icons for the errors tab KPI
function AlertCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
