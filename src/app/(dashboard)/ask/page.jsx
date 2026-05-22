"use client";

import { useState, useRef, useEffect } from "react";
import { queryAI, getStats } from "@/lib/api";
import { Send, Loader2, Bot, User, Filter } from "lucide-react";

const SUGGESTIONS = [
  "What are the top 5 most visited pages?",
  "What is the average latency per URL?",
  "How many errors occurred today?",
  "Which URLs have the highest latency?",
  "Show me event count by type",
  "What pages have 500 status codes?",
];

export default function AskPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch available domains
  useEffect(() => {
    getStats()
      .then((s) => setDomains(s.domains || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setInput("");
    const displayQ = domain ? `[${domain}] ${question}` : question;
    setMessages((prev) => [...prev, { role: "user", content: displayQ }]);
    setLoading(true);
    try {
      const data = await queryAI(question, domain || undefined);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.summary || "Here are the results:",
          data: data.results,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `⚠️ ${message}. Make sure your Gemini API key is configured in .env.local`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
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
          <h1 className="page-title">Ask AI</h1>
          <p className="page-subtitle">
            {domain
              ? `Asking about ${domain}`
              : "Ask questions about your logs in plain English"}
          </p>
        </div>
        {domains.length > 0 && (
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
      </div>

      <div className="chat-container">
        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <Bot size={30} />
              </div>
              <h3>Ask your logs anything</h3>
              <p>Powered by Gemini AI · MongoDB data</p>
              {domain && (
                <p style={{ fontSize: 12, color: "#7C3AED", marginTop: 4 }}>
                  🔍 Filtered to: <strong>{domain}</strong>
                </p>
              )}
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chat-suggestion"
                    onClick={() => ask(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`chat-message ${msg.role}`}>
                {msg.role === "ai" && (
                  <div className="chat-avatar ai-avatar">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="chat-avatar user-avatar">
                    <User size={16} />
                  </div>
                )}
              </div>
              {/* Data table */}
              {msg.data && msg.data.length > 0 && (
                <div className="chat-data-table" style={{ marginLeft: 44 }}>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {Object.keys(msg.data[0]).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.map((row, ri) => (
                          <tr key={ri}>
                            {Object.values(row).map((v, vi) => (
                              <td key={vi}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-loading">
              <div className="chat-avatar ai-avatar">
                <Bot size={16} />
              </div>
              <div className="chat-loading-bubble">
                <Loader2
                  size={15}
                  className="animate-spin"
                  style={{ color: "#7C3AED" }}
                />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          {domain && (
            <div
              style={{
                padding: "6px 16px",
                fontSize: 11,
                color: "#7C3AED",
                background: "rgba(139,92,246,0.08)",
                borderBottom: "1px solid rgba(139,92,246,0.15)",
              }}
            >
              🔍 Questions will be scoped to <strong>{domain}</strong>
            </div>
          )}
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder={
                domain
                  ? `Ask about ${domain}...`
                  : "Ask a question about your logs..."
              }
              disabled={loading}
            />

            <button
              className="chat-send-btn"
              onClick={() => ask(input)}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
