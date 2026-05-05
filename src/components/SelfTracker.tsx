'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * SelfTracker — Automatically captures real user interactions on this app
 * and sends them to /api/v1/ingest so the dashboard shows real data.
 *
 * Captures:
 *  • Page views (every route change)
 *  • Click events (with target info)
 *  • API call latencies (monkey-patches fetch)
 *  • JavaScript errors (window.onerror / unhandledrejection)
 */

const SESSION_ID = typeof window !== 'undefined'
  ? `sess_${Math.random().toString(36).substring(2, 10)}`
  : '';

// Buffer events and flush periodically to avoid hammering the API
const eventBuffer: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0);

  // Use sendBeacon for reliability (works even on page unload)
  // Fall back to fetch if sendBeacon isn't available
  const payload = JSON.stringify({ events: batch });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/v1/ingest', new Blob([payload], { type: 'application/json' }));
  } else {
    fetch('/api/v1/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, 2000); // flush every 2 seconds
}

function trackEvent(event: Record<string, unknown>) {
  eventBuffer.push({
    ...event,
    session_id: SESSION_ID,
    timestamp: new Date().toISOString(),
  });

  // If buffer gets large, flush immediately
  if (eventBuffer.length >= 20) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// Track click events (debounced to avoid spam)
let lastClickTime = 0;

function handleClick(e: MouseEvent) {
  const now = Date.now();
  if (now - lastClickTime < 300) return; // debounce 300ms
  lastClickTime = now;

  const target = e.target as HTMLElement;
  const tag = target.tagName?.toLowerCase() || 'unknown';
  const text = (target.textContent || '').trim().substring(0, 50);
  const id = target.id || '';
  const className = (target.className && typeof target.className === 'string')
    ? target.className.split(' ').slice(0, 2).join(' ')
    : '';

  // Only track meaningful clicks (buttons, links, inputs)
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
  const isInteractive = interactiveTags.includes(tag)
    || target.closest('button, a, [role="button"]');

  if (!isInteractive) return;

  trackEvent({
    event_type: 'click',
    url: window.location.pathname,
    latency_ms: 0,
    metadata: {
      tag,
      text: text || undefined,
      id: id || undefined,
      class: className || undefined,
      browser: getBrowserName(),
      device: getDeviceType(),
    },
  });
}

// Track JS errors
function handleError(event: ErrorEvent) {
  trackEvent({
    event_type: 'error',
    url: window.location.pathname,
    latency_ms: 0,
    status_code: 500,
    metadata: {
      message: event.message?.substring(0, 200),
      filename: event.filename?.split('/').pop(),
      line: event.lineno,
      col: event.colno,
      browser: getBrowserName(),
      device: getDeviceType(),
    },
  });
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason instanceof Error
    ? event.reason.message
    : String(event.reason);

  trackEvent({
    event_type: 'error',
    url: window.location.pathname,
    latency_ms: 0,
    status_code: 500,
    metadata: {
      message: `Unhandled Promise: ${reason.substring(0, 200)}`,
      browser: getBrowserName(),
      device: getDeviceType(),
    },
  });
}

// Monkey-patch fetch to track API call latencies
let fetchPatched = false;

function patchFetch() {
  if (fetchPatched) return;
  fetchPatched = true;

  const originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === 'string'
      ? args[0]
      : args[0] instanceof URL
        ? args[0].toString()
        : (args[0] as Request).url;

    // Don't track our own ingest calls (infinite loop!) or dashboard polling
    if (url.includes('/api/v1/ingest') || url.includes('/api/v1/stats') || url.includes('/api/v1/health') || url.includes('/api/v1/logs')) {
      return originalFetch.apply(this, args);
    }

    const start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const latency = Math.round(performance.now() - start);

      // Only track API calls (not static assets)
      if (url.startsWith('/api/') || url.includes('/api/')) {
        trackEvent({
          event_type: 'api_call',
          url: new URL(url, window.location.origin).pathname,
          latency_ms: latency,
          status_code: response.status,
          metadata: {
            method: (args[1]?.method || 'GET').toUpperCase(),
            browser: getBrowserName(),
            device: getDeviceType(),
          },
        });
      }

      return response;
    } catch (err) {
      const latency = Math.round(performance.now() - start);

      if (url.startsWith('/api/') || url.includes('/api/')) {
        trackEvent({
          event_type: 'error',
          url: new URL(url, window.location.origin).pathname,
          latency_ms: latency,
          status_code: 0,
          metadata: {
            message: `Fetch failed: ${err instanceof Error ? err.message : 'unknown'}`,
            method: (args[1]?.method || 'GET').toUpperCase(),
            browser: getBrowserName(),
            device: getDeviceType(),
          },
        });
      }

      throw err;
    }
  };
}

// Utilities
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// =============== Component ===============

export function SelfTracker() {
  const pathname = usePathname();
  const initialized = useRef(false);
  const prevPath = useRef<string>('');

  // One-time setup: attach global listeners
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Patch fetch to capture API latencies
    patchFetch();

    // Click tracking
    document.addEventListener('click', handleClick, { capture: true, passive: true });

    // Error tracking
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Flush on page unload
    window.addEventListener('beforeunload', flushEvents);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('beforeunload', flushEvents);
      flushEvents();
    };
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (pathname && pathname !== prevPath.current) {
      prevPath.current = pathname;

      // Measure page load time using Performance API
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const loadTime = navEntries.length > 0
        ? Math.round(navEntries[0].loadEventEnd - navEntries[0].startTime)
        : Math.round(performance.now());

      trackEvent({
        event_type: 'page_view',
        url: pathname,
        latency_ms: Math.max(loadTime, 1),
        status_code: 200,
        metadata: {
          referrer: document.referrer || 'direct',
          title: document.title,
          browser: getBrowserName(),
          device: getDeviceType(),
          screen: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
    }
  }, [pathname]);

  // This component renders nothing — it's purely a side-effect tracker
  return null;
}
