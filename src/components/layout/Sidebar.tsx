'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScrollText, BarChart3, MessageSquareText, Globe, Activity } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/analyze', label: 'Analyze Site', icon: Globe },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/charts', label: 'Charts', icon: BarChart3 },
  { href: '/ask', label: 'Ask AI', icon: MessageSquareText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={22} color="#6366F1" strokeWidth={2.5} />
        </div>
        <span className="sidebar-logo-text">SentientLog</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? 'active' : ''}`}
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
    </aside>
  );
}
