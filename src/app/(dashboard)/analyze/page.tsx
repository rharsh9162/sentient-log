'use client';

import { useState } from 'react';
import { analyzeWebsite, type AnalyzeResponse } from '@/lib/api';
import {
  Globe, Loader2, Zap, AlertTriangle, Clock,
  CheckCircle2, XCircle, ExternalLink, ArrowRight,
} from 'lucide-react';

const POPULAR_SITES = [
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { name: 'Reddit', url: 'https://www.reddit.com' },
  { name: 'Dev.to', url: 'https://dev.to' },
  { name: 'Hashnode', url: 'https://hashnode.com' },
];

export default function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(15);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (targetUrl?: string) => {
    const analyzeUrl = targetUrl || url;
    if (!analyzeUrl.trim() || loading) return;

    setLoading(true);
    setError('');
    setResult(null);
    setProgress('🔍 Crawling website... this may take 15-30 seconds');

    try {
      const data = await analyzeWebsite(analyzeUrl, maxPages);
      setResult(data);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return '#EF4444';
    if (status >= 500) return '#EF4444';
    if (status >= 400) return '#F59E0B';
    if (status >= 300) return '#60A5FA';
    return '#22C55E';
  };

  const getLatencyColor = (latency: string) => {
    const ms = parseInt(latency);
    if (ms > 2000) return '#EF4444';
    if (ms > 1000) return '#F59E0B';
    if (ms > 500) return '#60A5FA';
    return '#22C55E';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <h1 className="page-title">Analyze Website</h1>
        <p className="page-subtitle">Enter any URL to crawl and capture real performance data</p>
      </div>

      {/* URL Input Card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <label style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6, display: 'block' }}>Website URL</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Globe size={16} style={{ position: 'absolute', left: 14, color: '#64748B' }} />
              <input
                className="filter-input"
                style={{ paddingLeft: 40, width: '100%', height: 46 }}
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ width: 120 }}>
            <label style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6, display: 'block' }}>Max Pages</label>
            <select
              className="filter-select"
              style={{ height: 46 }}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              disabled={loading}
            >
              <option value={5}>5 pages</option>
              <option value={10}>10 pages</option>
              <option value={15}>15 pages</option>
              <option value={25}>25 pages</option>
              <option value={50}>50 pages</option>
            </select>
          </div>

          <button
            className="analyze-btn"
            onClick={() => handleAnalyze()}
            disabled={loading || !url.trim()}
            style={{
              height: 46,
              padding: '0 24px',
              background: loading ? 'rgba(203, 213, 225, 0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: loading ? '#475569' : '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              opacity: loading || !url.trim() ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Quick picks */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>Popular sites to try:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {POPULAR_SITES.map((site) => (
              <button
                key={site.name}
                onClick={() => { setUrl(site.url); handleAnalyze(site.url); }}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 20,
                  color: '#818CF8',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#818CF8', margin: '0 auto 12px' }} />
          <p style={{ color: '#94A3B8', fontSize: 14 }}>{progress}</p>
          <div style={{ marginTop: 12, height: 3, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
            <div className="analyze-progress-bar" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ padding: 20, borderLeft: '3px solid #EF4444' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertTriangle size={18} style={{ color: '#EF4444' }} />
            <p style={{ color: '#F87171', fontSize: 14 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon indigo"><Globe size={22} /></div>
              <div>
                <p className="kpi-label">Pages Crawled</p>
                <p className="kpi-value">{result.pages_crawled}</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon green"><Clock size={22} /></div>
              <div>
                <p className="kpi-label">Avg Latency</p>
                <p className="kpi-value">{result.summary.avg_latency}ms</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon red"><AlertTriangle size={22} /></div>
              <div>
                <p className="kpi-label">Errors</p>
                <p className="kpi-value">{result.summary.errors}</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon amber"><Zap size={22} /></div>
              <div>
                <p className="kpi-label">Events Created</p>
                <p className="kpi-value">{result.events_created}</p>
              </div>
            </div>
          </div>

          {/* Success message */}
          <div className="card" style={{ padding: 16, borderLeft: '3px solid #22C55E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <CheckCircle2 size={18} style={{ color: '#10B981' }} />
                <span style={{ color: '#10B981', fontSize: 14, fontWeight: 500 }}>{result.message}</span>
              </div>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Fastest: {result.summary.fastest}ms · Slowest: {result.summary.slowest}ms
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 6, marginLeft: 28 }}>
              Data is now available in Overview, Logs, and Charts pages.
              <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
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
                            color: '#7C3AED',
                            textDecoration: 'none',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {new URL(r.url).pathname || '/'}
                          <ExternalLink size={10} />
                        </a>
                      </td>
                      <td style={{ color: '#475569', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: getStatusColor(r.status),
                          fontWeight: 600,
                          fontSize: 13,
                        }}>
                          {r.status === 0 ? <XCircle size={13} /> : r.status >= 400 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                          {r.status || 'FAIL'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: getLatencyColor(r.latency), fontWeight: 500, fontSize: 13 }}>
                          {r.latency}
                        </span>
                      </td>
                      <td style={{ color: '#94A3B8', fontSize: 13 }}>{r.links}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
