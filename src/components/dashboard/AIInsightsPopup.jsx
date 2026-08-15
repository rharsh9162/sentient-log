"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import axios from "axios";

export default function AIInsightsPopup({ domain }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch insights when opened for the first time
  useEffect(() => {
    if (isOpen && !insights && !loading) {
      fetchInsights();
    }
  }, [isOpen, domain]);

  // Re-fetch if domain changes while open
  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    } else {
      setInsights(null); // Clear insights if domain changes while closed so it fetches fresh next time
    }
  }, [domain]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const url = domain ? `/api/v1/ai/insights?domain=${encodeURIComponent(domain)}` : "/api/v1/ai/insights";
      const res = await axios.get(url);
      setInsights(res.data.insights || ["No insights available."]);
    } catch (e) {
      console.error(e);
      setInsights(["Failed to load insights."]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Matches CSS animation duration
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#2563EB",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
          transition: "background 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#1D4ED8")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#2563EB")}
      >
        <Sparkles size={14} />
        AI Insights
      </button>

      {(isOpen || isClosing) && (
        <div className={`ai-insights-popup ${isClosing ? "closing" : ""}`}>
          <button className="ai-insights-close" onClick={handleClose}>
            <X size={16} />
          </button>
          
          <div className="ai-insights-header">
            <Sparkles size={16} color="#2563EB" />
            <h3 className="ai-insights-title">AI Insights</h3>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", padding: "20px 0" }}>
              <Loader2 size={16} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Analyzing data...</span>
            </div>
          ) : (
            <ul className="ai-insights-list">
              {insights?.map((insight, idx) => (
                <li
                  key={idx}
                  className="ai-insight-item"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="ai-insight-bullet" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
