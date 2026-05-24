/**
 * SentientLog External Tracker
 * Captures page views, clicks, API latencies, and errors.
 * 
 * Usage:
 * <script src="https://sentient-log-rho.vercel.app/tracker.js" data-site-id="YOUR_USER_ID" defer></script>
 */

(function () {
  if (typeof window === "undefined") return;

  const scriptTag = document.currentScript || document.querySelector('script[src*="tracker.js"]');
  const siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  const isInternal = scriptTag ? scriptTag.hasAttribute("data-internal") : false;
  const scriptOrigin = scriptTag ? new URL(scriptTag.src).origin : "https://sentient-log-rho.vercel.app";
  const ingestUrl = `${scriptOrigin}/api/v1/ingest?siteId=${siteId || ""}`;

  if (!siteId && !isInternal) {
    console.warn("SentientLog: data-site-id attribute is missing on the script tag. Tracking is disabled.");
    return;
  }

  const SESSION_ID = `sess_${Math.random().toString(36).substring(2, 10)}`;
  const eventBuffer = [];
  let flushTimer = null;

  function flushEvents() {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0);

    const payload = JSON.stringify({ events: batch });

    fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, 2000);
  }

  function trackEvent(event) {
    eventBuffer.push({
      ...event,
      metadata: {
        ...event.metadata,
        domain: window.location.hostname,
      },
      session_id: SESSION_ID,
      timestamp: new Date().toISOString(),
    });

    if (eventBuffer.length >= 20) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }

  // Utilities
  function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    return "Other";
  }

  function getDeviceType() {
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  // 1. Track Page Views (SPA & Normal)
  let lastPath = window.location.pathname;
  
  function trackPageView() {
    trackEvent({
      event_type: "page_view",
      url: window.location.href,
      latency_ms: 0,
      metadata: { browser: getBrowserName(), device: getDeviceType() },
    });
  }

  // Initial page view
  trackPageView();

  // Watch for SPA history changes
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  };
  window.addEventListener("popstate", () => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  });

  // 2. Track Clicks
  let lastClickTime = 0;
  document.addEventListener("click", (e) => {
    const now = Date.now();
    if (now - lastClickTime < 300) return;
    lastClickTime = now;

    const target = e.target;
    const tag = target.tagName?.toLowerCase() || "unknown";
    const text = (target.textContent || "").trim().substring(0, 50);
    const id = target.id || "";
    const className = target.className && typeof target.className === "string" ? target.className.split(" ").slice(0, 2).join(" ") : "";

    const isInteractive = ["button", "a", "input", "select", "textarea", "label"].includes(tag) || target.closest('button, a, [role="button"]');
    if (!isInteractive) return;

    trackEvent({
      event_type: "click",
      url: window.location.href,
      latency_ms: 0,
      metadata: { tag, text: text || undefined, id: id || undefined, class: className || undefined, browser: getBrowserName(), device: getDeviceType() },
    });
  }, true);

  // 3. Track API Latency
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const urlStr = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].toString() : args[0].url;
    
    // Don't track our own ingest
    if (urlStr.includes("/api/v1/ingest")) {
      return originalFetch.apply(this, args);
    }

    const start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const latency = Math.round(performance.now() - start);

      trackEvent({
        event_type: "api_call",
        url: urlStr.length > 100 ? urlStr.substring(0, 100) + '...' : urlStr,
        latency_ms: latency,
        status_code: response.status,
        metadata: { method: (args[1]?.method || "GET").toUpperCase(), browser: getBrowserName(), device: getDeviceType() },
      });
      return response;
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      trackEvent({
        event_type: "error",
        url: urlStr.length > 100 ? urlStr.substring(0, 100) + '...' : urlStr,
        latency_ms: latency,
        status_code: 0,
        metadata: { message: `Fetch failed: ${err.message || "unknown"}`, method: (args[1]?.method || "GET").toUpperCase(), browser: getBrowserName(), device: getDeviceType() },
      });
      throw err;
    }
  };

  // 4. Track JS Errors
  window.addEventListener("error", (event) => {
    trackEvent({
      event_type: "error",
      url: window.location.href,
      latency_ms: 0,
      status_code: 500,
      metadata: { message: event.message?.substring(0, 200), filename: event.filename?.split("/").pop(), browser: getBrowserName(), device: getDeviceType() },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    trackEvent({
      event_type: "error",
      url: window.location.href,
      latency_ms: 0,
      status_code: 500,
      metadata: { message: `Unhandled Promise: ${reason.substring(0, 200)}`, browser: getBrowserName(), device: getDeviceType() },
    });
  });

  // Flush on unload
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });

})();
