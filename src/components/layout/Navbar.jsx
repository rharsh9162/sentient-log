"use client";

import { useEffect, useState, useRef } from "react";
import { UserButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getHealth, clearData } from "@/lib/api";
import { Trash2 } from "lucide-react";

export function Navbar() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [clearing, setClearing] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await getHealth();
        setStatus(data.db === "connected" ? "connected" : "disconnected");
      } catch {
        setStatus("disconnected");
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

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
      const result = await clearData(action);
      alert(result.message);
      window.location.reload();
    } catch {
      alert("Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-status">
        <span className={`navbar-status-dot ${status}`} />
        <span>
          {status === "connected"
            ? "Connected"
            : status === "disconnected"
              ? "Offline"
              : "Connecting..."}
        </span>
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
