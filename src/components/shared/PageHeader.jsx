import { useState } from "react";
import { Filter, Copy, Check } from "lucide-react";
import AIInsightsPopup from "@/components/dashboard/AIInsightsPopup";

export default function PageHeader({ 
  title, 
  subtitle, 
  domain, 
  setDomain, 
  domains = [], 
  userId = null,
  showInsights = false 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="page-title">{title}</h1>
          {userId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-api_call" style={{ fontSize: '11px', padding: '3px 8px' }}>
                Account ID: <span style={{ fontFamily: 'monospace', marginLeft: '4px' }}>{userId}</span>
              </span>
              <button
                onClick={handleCopyId}
                title="Copy Account ID"
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#334155'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
        <p className="page-subtitle">
          {domain ? `Showing data for ${domain}` : subtitle}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {domains && domains.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} style={{ color: "#64748B" }} />
            <select
              className="filter-select"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{ minWidth: 180 }}
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
        {showInsights && <AIInsightsPopup domain={domain} />}
      </div>
    </div>
  );
}
