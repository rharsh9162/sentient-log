"use client";

import { useState } from "react";
import { analyzeWebsite } from "@/lib/api";
import {
  Globe,
  Loader2,
  Zap,
  AlertTriangle,
} from "lucide-react";
import AnalyzeResults from "@/components/analyze/AnalyzeResults";

const POPULAR_SITES = [
  { name: "GitHub", url: "https://github.com" },
  { name: "Wikipedia", url: "https://en.wikipedia.org" },
  { name: "Stack Overflow", url: "https://stackoverflow.com" },
  { name: "MDN Web Docs", url: "https://developer.mozilla.org" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "Reddit", url: "https://www.reddit.com" },
  { name: "Dev.to", url: "https://dev.to" },
  { name: "Hashnode", url: "https://hashnode.com" },
];

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(15);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async (targetUrl) => {
    const analyzeUrl = targetUrl || url;
    if (!analyzeUrl.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setProgress("🔍 Crawling website... this may take 15-30 seconds");

    try {
      const data = await analyzeWebsite(analyzeUrl, maxPages);
      setResult(data);
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div className="page-header">
        <h1 className="page-title">Analyze Website</h1>
        <p className="page-subtitle">
          Enter any URL to crawl and capture real performance data
        </p>
      </div>

      {/* URL Input Card */}
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <label
              style={{
                fontSize: 13,
                color: "#94A3B8",
                marginBottom: 6,
                display: "block",
              }}
            >
              Website URL
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Globe
                size={16}
                style={{ position: "absolute", left: 14, color: "#64748B" }}
              />
              <input
                className="filter-input"
                style={{ paddingLeft: 40, width: "100%", height: 46 }}
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ width: 120 }}>
            <label
              style={{
                fontSize: 13,
                color: "#94A3B8",
                marginBottom: 6,
                display: "block",
              }}
            >
              Max Pages
            </label>
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
              padding: "0 24px",
              background: loading
                ? "rgba(203, 213, 225, 0.4)"
                : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: loading ? "#475569" : "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
              opacity: loading || !url.trim() ? 0.6 : 1,
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Quick picks */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
            Popular sites to try:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {POPULAR_SITES.map((site) => (
              <button
                key={site.name}
                onClick={() => {
                  setUrl(site.url);
                  handleAnalyze(site.url);
                }}
                disabled={loading}
                style={{
                  padding: "6px 14px",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: 20,
                  color: "#818CF8",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
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
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "#818CF8", margin: "0 auto 12px" }}
          />
          <p style={{ color: "#94A3B8", fontSize: 14 }}>{progress}</p>
          <div
            style={{
              marginTop: 12,
              height: 3,
              background: "#E2E8F0",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div className="analyze-progress-bar" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{ padding: 20, borderLeft: "3px solid #EF4444" }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <AlertTriangle size={18} style={{ color: "#EF4444" }} />
            <p style={{ color: "#F87171", fontSize: 14 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && <AnalyzeResults result={result} />}
    </div>
  );
}
