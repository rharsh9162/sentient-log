import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

export const METRIC_OPTIONS = [
  { value: "avg_latency", label: "Avg latency", unit: "ms", defaultThreshold: 2000 },
  { value: "error_rate", label: "Error rate", unit: "%", defaultThreshold: 10 },
  { value: "slow_pages", label: "Slow pages count", unit: "pages", defaultThreshold: 5 },
  { value: "total_errors", label: "Total errors", unit: "errors", defaultThreshold: 20 },
];

export const FREQUENCY_OPTIONS = [
  { value: "15m", label: "Every 15 min" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function AlertForm({ initialData, domains, onSubmit, onCancel, loading }) {
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formMetric, setFormMetric] = useState("avg_latency");
  const [formCondition, setFormCondition] = useState("gt");
  const [formThreshold, setFormThreshold] = useState(2000);
  const [formFrequency, setFormFrequency] = useState("daily");

  useEffect(() => {
    if (initialData) {
      setFormName(initialData.name);
      setFormDomain(initialData.domain);
      setFormMetric(initialData.metric);
      setFormCondition(initialData.condition);
      setFormThreshold(initialData.threshold);
      setFormFrequency(initialData.frequency);
    } else {
      setFormName("");
      setFormDomain(domains[0] || "");
      setFormMetric("avg_latency");
      setFormCondition("gt");
      setFormThreshold(2000);
      setFormFrequency("daily");
    }
  }, [initialData, domains]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: formName,
      domain: formDomain,
      metric: formMetric,
      condition: formCondition,
      threshold: formThreshold,
      frequency: formFrequency,
    });
  };

  const handleMetricChange = (metric) => {
    setFormMetric(metric);
    const opt = METRIC_OPTIONS.find((m) => m.value === metric);
    if (opt) setFormThreshold(opt.defaultThreshold);
  };

  const currentUnit = METRIC_OPTIONS.find((m) => m.value === formMetric)?.unit || "";

  return (
    <div className="card" id="create-form">
      <div className="card-header">
        <span className="card-title">
          {initialData ? "Edit Alert Rule" : "Create New Alert Rule"}
        </span>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748B",
          }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="alert-form">
        <div className="alert-form-row">
          <div className="alert-form-group" style={{ flex: 2, minWidth: 200 }}>
            <label className="alert-form-label">Rule name</label>
            <input
              className="filter-input"
              style={{ minWidth: "auto", width: "100%" }}
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                className="filter-input"
                style={{ minWidth: "auto", width: 80 }}
                type="number"
                value={formThreshold}
                onChange={(e) => setFormThreshold(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: 12, color: "#64748B" }}>{currentUnit}</span>
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

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="alert-new-btn" disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update Alert" : "Create Alert"}
          </button>
          <button type="button" className="export-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
