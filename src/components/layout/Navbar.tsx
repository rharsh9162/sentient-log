'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getHealth, clearData } from '@/lib/api';
import { User, LogOut, ChevronDown, Trash2 } from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await getHealth();
        setStatus(data.db === 'connected' ? 'connected' : 'disconnected');
      } catch {
        setStatus('disconnected');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClear = async (action: 'clear_orphaned' | 'clear_mine') => {
    const label = action === 'clear_orphaned' ? 'old shared data' : 'all your data';
    if (!confirm(`Are you sure you want to clear ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const result = await clearData(action);
      alert(result.message);
      window.location.reload();
    } catch {
      alert('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-status">
        <span className={`navbar-status-dot ${status}`} />
        <span>
          {status === 'connected'
            ? 'Connected'
            : status === 'disconnected'
            ? 'Offline'
            : 'Connecting...'}
        </span>
      </div>

      <div className="navbar-right">
        <div className="navbar-user" ref={menuRef}>
          <button
            className="navbar-user-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <User size={15} />
            <span>{session?.user?.name || 'User'}</span>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div className="navbar-user-menu">
              <button onClick={() => handleClear('clear_mine')} disabled={clearing}>
                <Trash2 size={15} />
                {clearing ? 'Clearing...' : 'Clear My Data'}
              </button>
              <div style={{ height: 1, background: '#1E1E2E', margin: '4px 0' }} />
              <button onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
