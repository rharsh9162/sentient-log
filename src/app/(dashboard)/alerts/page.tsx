'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAlerts, createAlert, updateAlert, deleteAlert,
  getAlertHistory, checkAlerts, getStats,
  type AlertRule, type AlertSummary, type AlertHistoryItem,
} from '@/lib/api';
import {
  Bell, BellRing, BellOff, Plus, Trash2, Edit3,
  Activity, AlertTriangle, Clock, Zap, RefreshCw, X,
} from 'lucide-react';

const METRIC_OPTIONS = [
  { value: 'avg_latency', label: 'Avg latency', unit: 'ms', defaultThreshold: 2000 },
  { value: 'error_rate', label: 'Error rate', unit: '%', defaultThreshold: 10 },
  { value: 'slow_pages', label: 'Slow pages count', unit: 'pages', defaultThreshold: 5 },
  { value: 'total_errors', label: 'Total errors', unit: 'errors', defaultThreshold: 20 },
];

const FREQUENCY_OPTIONS = [
  { value: '15m', label: 'Every 15 min' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

type FilterType = 'all' | 'active' | 'fired' | 'paused';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({ total_rules: 0, active: 0, fired_today: 0, total_firings: 0 });
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formMetric, setFormMetric] = useState('avg_latency');
  const [formCondition, setFormCondition] = useState('gt');
  const [formThreshold, setFormThreshold] = useState(2000);
  const [formFrequency, setFormFrequency] = useState('daily');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [alertsData, historyData, statsData] = await Promise.all([
        getAlerts(),
        getAlertHistory(),
        getStats(),
      ]);
      setAlerts(alertsData.alerts);
      setSummary(alertsData.summary);
      setHistory(historyData.history);
      setDomains(statsData.domains || []);
    } catch (err) {
      console.error('Failed to fetch alerts data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await checkAlerts();
      if (result.fired > 0) {
        alert(`${result.fired} alert(s) fired!`);
      } else {
        alert('All clear — no alerts triggered.');
      }
      await fetchData();
    } catch {
      alert('Failed to check alerts');
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await updateAlert(id, { enabled: !currentEnabled });
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, enabled: !currentEnabled } : a))
      );
      setSummary((prev) => ({
        ...prev,
        active: currentEnabled ? prev.active - 1 : prev.active + 1,
      }));
    } catch {
      alert('Failed to update alert');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this alert rule? This cannot be undone.')) return;
    try {
      await deleteAlert(id);
      await fetchData();
    } catch {
      alert('Failed to delete alert');
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingId(rule._id);
    setFormName(rule.name);
    setFormDomain(rule.domain);
    setFormMetric(rule.metric);
    setFormCondition(rule.condition);
    setFormThreshold(rule.threshold);
    setFormFrequency(rule.frequency);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDomain(domains[0] || '');
    setFormMetric('avg_latency');
    setFormCondition('gt');
    setFormThreshold(2000);
    setFormFrequency('daily');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingId) {
        await updateAlert(editingId, {
          name: formName,
          domain: formDomain,
          metric: formMetric as AlertRule['metric'],
          condition: formCondition as AlertRule['condition'],
          threshold: formThreshold,
          frequency: formFrequency,
        });
      } else {
        await createAlert({
          name: formName,
          domain: formDomain,
          metric: formMetric,
          condition: formCondition,
          threshold: formThreshold,
          frequency: formFrequency,
        });
      }
      resetForm();
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save alert');
    } finally {
      setFormLoading(false);
    }
  };

  const handleMetricChange = (metric: string) => {
    setFormMetric(metric);
    const opt = METRIC_OPTIONS.find((m) => m.value === metric);
    if (opt) setFormThreshold(opt.defaultThreshold);
  };

  const currentUnit = METRIC_OPTIONS.find((m) => m.value === formMetric)?.unit || '';

  const getAlertStatus = (rule: AlertRule): 'active' | 'fired' | 'paused' => {
    if (!rule.enabled) return 'paused';
    if (rule.last_fired_at) {
      const hours = (Date.now() - new Date(rule.last_fired_at).getTime()) / (1000 * 60 * 60);
      if (hours < 24) return 'fired';
    }
    return 'active';
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return getAlertStatus(a) === filter;
  });

  const formatFiredTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const formatHistoryTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff} days ago`;
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'avg_latency': return Clock;
      case 'error_rate': return AlertTriangle;
      case 'slow_pages': return Zap;
      case 'total_errors': return AlertTriangle;
      default: return Activity;
    }
  };

  const formatMetricValue = (value: number, metric: string) => {
    if (metric === 'avg_latency') return `${Math.round(value)}ms`;
    if (metric === 'error_rate') return `${value.toFixed(1)}%`;
    if (metric === 'slow_pages') return `${value} pages`;
    return `${value} errors`;
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Alerts</h1>
            <p className="page-subtitle">Get notified when your metrics cross a threshold</p>
          </div>
        </div>
        <div className="spinner-page"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Get notified when your metrics cross a threshold</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="export-btn"
            onClick={handleCheck}
            disabled={checking}
            title="Check all enabled alerts now"
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking...' : 'Check Now'}
          </button>
          <button
            className="alert-new-btn"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={15} />
            New Alert
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card animate-fade-in">
          <div className="kpi-icon indigo"><Bell size={22} /></div>
          <div>
            <div className="kpi-label">Total Rules</div>
            <div className="kpi-value">{summary.total_rules}</div>
          </div>
        </div>
        <div className="kpi-card animate-fade-in">
          <div className="kpi-icon green"><Activity size={22} /></div>
          <div>
            <div className="kpi-label">Active</div>
            <div className="kpi-value">{summary.active}</div>
          </div>
        </div>
        <div className="kpi-card animate-fade-in">
          <div className="kpi-icon red"><BellRing size={22} /></div>
          <div>
            <div className="kpi-label">Fired Today</div>
            <div className="kpi-value">{summary.fired_today}</div>
          </div>
        </div>
        <div className="kpi-card animate-fade-in">
          <div className="kpi-icon amber"><Zap size={22} /></div>
          <div>
            <div className="kpi-label">Total Firings</div>
            <div className="kpi-value">{summary.total_firings}</div>
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Alert Rules</span>
          <div className="alert-chip-bar">
            {(['all', 'active', 'fired', 'paused'] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`alert-chip ${filter === f ? 'alert-chip-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748B', fontSize: 14 }}>
            {alerts.length === 0 ? 'No alert rules yet. Create one to get started!' : 'No alerts match this filter.'}
          </div>
        ) : (
          <div className="alert-rules-list">
            {filteredAlerts.map((rule) => {
              const status = getAlertStatus(rule);
              const MetricIcon = getMetricIcon(rule.metric);
              return (
                <div key={rule._id} className="alert-rule-row">
                  <div className={`alert-rule-icon ${status === 'fired' ? 'alert-rule-icon-fired' : status === 'paused' ? 'alert-rule-icon-paused' : 'alert-rule-icon-active'}`}>
                    {status === 'fired' ? <BellRing size={16} /> : status === 'paused' ? <BellOff size={16} /> : <MetricIcon size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: status === 'paused' ? '#64748B' : '#1E293B' }}>{rule.name}</span>
                      <span className={`alert-badge alert-badge-${status}`}>
                        {status === 'fired' && rule.last_fired_at ? (
                          <><BellRing size={10} style={{ marginRight: 3 }} />Fired {formatFiredTime(rule.last_fired_at)}</>
                        ) : status === 'paused' ? 'Paused' : 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {METRIC_OPTIONS.find((m) => m.value === rule.metric)?.label || rule.metric} on{' '}
                      <strong style={{ color: '#1E293B', fontWeight: 500 }}>{rule.domain}</strong>{' '}
                      {rule.condition === 'gt' ? '>' : '<'}{' '}
                      <strong style={{ color: '#1E293B', fontWeight: 500 }}>{rule.threshold}{METRIC_OPTIONS.find((m) => m.value === rule.metric)?.unit}</strong>
                      {' '}&nbsp;·&nbsp; Checked {FREQUENCY_OPTIONS.find(f => f.value === rule.frequency)?.label?.toLowerCase() || rule.frequency}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className={`alert-toggle ${rule.enabled ? 'alert-toggle-on' : 'alert-toggle-off'}`}
                      onClick={() => handleToggle(rule._id, rule.enabled)}
                      title={rule.enabled ? 'Disable' : 'Enable'}
                    />
                    <Edit3
                      size={16}
                      style={{ color: '#64748B', cursor: 'pointer' }}
                      onClick={() => handleEdit(rule)}
                    />
                    <Trash2
                      size={16}
                      style={{ color: '#64748B', cursor: 'pointer' }}
                      onClick={() => handleDelete(rule._id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Firings */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Firings</span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748B', fontSize: 14 }}>
            No alerts have fired yet.
          </div>
        ) : (
          <div className="alert-rules-list">
            {history.map((item) => (
              <div key={item._id} className="alert-rule-row">
                <div className="alert-hist-dot" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{item.rule_name}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {METRIC_OPTIONS.find((m) => m.value === item.metric)?.label || item.metric} was{' '}
                    <strong style={{ color: '#EF4444', fontWeight: 500 }}>{formatMetricValue(item.measured_value, item.metric)}</strong>
                    {' '}— threshold {formatMetricValue(item.threshold, item.metric)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                  {formatHistoryTime(item.fired_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card" id="create-form">
          <div className="card-header">
            <span className="card-title">{editingId ? 'Edit Alert Rule' : 'Create New Alert Rule'}</span>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="alert-form">
            <div className="alert-form-row">
              <div className="alert-form-group" style={{ flex: 2, minWidth: 200 }}>
                <label className="alert-form-label">Rule name</label>
                <input
                  className="filter-input"
                  style={{ minWidth: 'auto', width: '100%' }}
                  type="text"
                  placeholder="e.g. GitHub latency spike"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="alert-form-group" style={{ minWidth: 140 }}>
                <label className="alert-form-label">Domain</label>
                <select
                  className="filter-select"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  required
                >
                  <option value="">Select domain</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="alert-form-row">
              <div className="alert-form-group" style={{ minWidth: 160 }}>
                <label className="alert-form-label">Metric</label>
                <select
                  className="filter-select"
                  value={formMetric}
                  onChange={(e) => handleMetricChange(e.target.value)}
                >
                  {METRIC_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="alert-form-group" style={{ maxWidth: 120 }}>
                <label className="alert-form-label">Condition</label>
                <select
                  className="filter-select"
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                >
                  <option value="gt">greater than</option>
                  <option value="lt">less than</option>
                </select>
              </div>
              <div className="alert-form-group" style={{ maxWidth: 140 }}>
                <label className="alert-form-label">Threshold</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="filter-input"
                    style={{ minWidth: 'auto', width: 80 }}
                    type="number"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: 12, color: '#64748B' }}>{currentUnit}</span>
                </div>
              </div>
              <div className="alert-form-group" style={{ maxWidth: 140 }}>
                <label className="alert-form-label">Frequency</label>
                <select
                  className="filter-select"
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                >
                  {FREQUENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="alert-email-note">
              <Bell size={15} style={{ flexShrink: 0 }} />
              Alert notifications will be sent to your email via Resend when the threshold is crossed
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="alert-new-btn" disabled={formLoading}>
                {formLoading ? 'Saving...' : editingId ? 'Update Alert' : 'Create Alert'}
              </button>
              <button type="button" className="export-btn" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
