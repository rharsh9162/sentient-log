"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  BarChart3,
  MessageSquareText,
  Globe,
  Bell,
  ChevronLeft,
  Settings,
  UserCircle
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze Site", icon: Globe },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/ask", label: "Ask AI", icon: MessageSquareText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside className="sidebar">
      {/* Absolute Toggle Button */}
      <button 
        className={`sidebar-floating-toggle ${!isExpanded ? "collapsed" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Icon Rail (Always Visible) */}
      <div className="sidebar-rail">
        <div className="sidebar-logo-icon" style={{ padding: '4px', background: 'transparent', border: 'none' }}>
          <Image src="/logo.png" alt="SentientLog" width={32} height={32} style={{ objectFit: 'contain', borderRadius: '8px' }} />
        </div>
        
        <div className="sidebar-rail-icons">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={`rail-${href}`} href={href}>
                <button className={`rail-icon-btn ${active ? "active" : ""}`} title={label}>
                  <Icon size={20} />
                </button>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-rail-bottom">
          <button className="rail-icon-btn" title="Settings">
            <Settings size={20} />
          </button>
          <button className="rail-icon-btn" title="Profile">
            <UserCircle size={20} />
          </button>
        </div>
      </div>

      {/* Expanded Panel (Collapsible) */}
      <div className={`sidebar-panel ${!isExpanded ? "collapsed" : ""}`}>
        <div className="sidebar-panel-header">
          <span className="sidebar-logo-text">SentientLog</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${active ? "active" : ""}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p>v1.0.0 · SentientLog</p>
        </div>
      </div>
    </aside>
  );
}
