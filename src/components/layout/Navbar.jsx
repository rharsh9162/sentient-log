"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import axios from "axios";
import { Trash2, Users } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

export function Navbar() {
  const { isConnected, visitors } = useSocket();
  const [clearing, setClearing] = useState(false);

  const handleClear = async (action) => {
    const label =
      action === "clear_orphaned" ? "old shared data" : "all your data";
    if (
      !confirm(
        `Are you sure you want to clear ${label}? This cannot be undone.`,
      )
    )
      return;
    setClearing(true);
    try {
      const { data } = await axios.post("/api/v1/clear", { action });
      alert(data.message);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-status">
        <span className={`navbar-status-dot ${isConnected ? "connected" : "disconnected"}`} />
        <span>
          {isConnected ? "Live" : "Offline"}
        </span>
        {isConnected && visitors.total > 0 && (
          <span className="navbar-visitors-badge">
            <Users size={12} />
            {visitors.total}
          </span>
        )}
      </div>

      <div className="navbar-right">
        <button
          className="export-btn"
          style={{
            marginRight: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#EF4444",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
          onClick={() => handleClear("clear_mine")}
          disabled={clearing}
        >
          <Trash2 size={14} />
          {clearing ? "Clearing..." : "Clear Data"}
        </button>
        <div className="navbar-user">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: "32px",
                  height: "32px",
                },
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
