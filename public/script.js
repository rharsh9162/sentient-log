/**
 * SentientLog Tracker v2
 * Real-time event tracking via WebSockets with HTTP fallback.
 *
 * Usage (external):
 * <script src="https://your-domain.com/tracker.js" data-site-id="YOUR_USER_ID" defer></script>
 *
 * Usage (internal / dashboard):
 * <script src="/tracker.js" data-internal="true" defer></script>
 */

(function () { // Immediately Invoked Function Expression --> The function is created and immediately executed.
  if (typeof window === "undefined") return;  // If this isn't a browser environment, stop executing

  const scriptTag =
    document.currentScript ||  // refers to the <script> currently executing
    document.querySelector('script[src*="script.js"]') ||  // searches the page for a <script> whose src contains: script.js
    document.querySelector('script[data-site-id]'); // searches for any script having: data-site-id
  const siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  const isInternal = scriptTag
    ? scriptTag.hasAttribute("data-internal")  // Your own dashboard loads the same tracker
    : false;
  let scriptOrigin = window.location.origin;
  if (scriptTag && scriptTag.src) {
    try {
      scriptOrigin = new URL(scriptTag.src, window.location.origin).origin;
    } catch (e) {
      // Fallback if parsing fails
    }
  }

  if (!siteId && !isInternal) {
    console.warn(
      "SentientLog: data-site-id attribute is missing. Tracking disabled."
    );
    return;
  }

  // ── Session ──
  const SESSION_ID = `sess_${Math.random().toString(36).substring(2, 10)}`;
  // The purpose is to associate several events with the same browsing session. // refreshing the page can create a new session ID.

  // ── Offline Queue ──
  const offlineQueue = [];    // Stores events when Socket.IO isn't connected yet.  // Then when Socket.IO connects -> flushOfflineQueue() sends everything.
  let socketConnected = false;
  let socket = null;

  // ── HTTP Fallback (used if Socket.IO fails to load) ── USE HTTP POST 
  const ingestUrl = `${scriptOrigin}/api/v1/ingest?siteId=${siteId || ""}`;
  let useHttpFallback = false;
  const httpBuffer = [];
  let httpFlushTimer = null;

  function httpFlush() {
    if (httpBuffer.length === 0) return;
    const batch = httpBuffer.splice(0);  // empty the httpBuffer and assign its value to batch
    fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },  // So this header is important because it says: “the body is JSON”
      body: JSON.stringify({ events: batch }),
      keepalive: true,  // This tells the browser to try to keep the request alive even around page termination.
    }).catch(() => { });
  }

  // You don't send every event immediately.
  // events can accumulate for 2 seconds.
  function httpScheduleFlush() {
    if (httpFlushTimer) return;
    httpFlushTimer = setTimeout(() => {
      httpFlushTimer = null;
      httpFlush();
    }, 2000);
  }

  // ── Browser detection ──
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

  function getReferrerSource() {
    const ref = document.referrer; // tells you which page the visitor came from
    if (!ref) return "direct";
    try {
      const hostname = new URL(ref).hostname;
      if (hostname.includes("google")) return "google";
      if (hostname.includes("bing")) return "bing";
      if (hostname.includes("linkedin")) return "linkedin";
      if (hostname.includes("twitter") || hostname.includes("x.com"))
        return "twitter";
      if (hostname.includes("facebook") || hostname.includes("fb.com"))
        return "facebook";
      if (hostname.includes("reddit")) return "reddit";
      if (hostname.includes("github")) return "github";
      return hostname;
    } catch {
      return "other";
    }
  }

  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    if (params.get("utm_source")) utm.utm_source = params.get("utm_source");
    if (params.get("utm_medium")) utm.utm_medium = params.get("utm_medium");
    if (params.get("utm_campaign"))
      utm.utm_campaign = params.get("utm_campaign");
    return Object.keys(utm).length > 0 ? utm : undefined;
  }

  // ── Core: trackEvent ──
  function trackEvent(event) {
    const enrichedEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        domain: window.location.hostname,
        referrer: getReferrerSource(),
        ...(getUtmParams() || {}),
      },
      session_id: SESSION_ID,
      user_id: siteId || undefined,
      timestamp: new Date().toISOString(),
    };

    if (useHttpFallback) {
      httpBuffer.push(enrichedEvent);
      if (httpBuffer.length >= 20) {
        httpFlush();
      } else {
        httpScheduleFlush();
      }
      return;
    }

    if (socket && socketConnected) {
      socket.emit("event", enrichedEvent);
    } else {
      offlineQueue.push(enrichedEvent);
    }
  }

  function flushOfflineQueue() {
    if (!socket || !socketConnected || offlineQueue.length === 0) return;
    const batch = offlineQueue.splice(0);
    socket.emit("event", batch);
  }

  // ── Socket.IO Connection ──
  function initSocket() {
    // Socket.IO client is loaded from the server automatically at /socket.io/socket.io.js
    const ioScript = document.createElement("script");
    ioScript.src = `${scriptOrigin}/socket.io/socket.io.js`;
    ioScript.async = true;

    ioScript.onload = () => {
      if (typeof io === "undefined") {
        console.warn("SentientLog: Socket.IO client failed to initialize. Using HTTP fallback.");
        useHttpFallback = true;
        return;
      }

      socket = io(`${scriptOrigin}/stream`, {
        query: { siteId: siteId || "" },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        socketConnected = true;
        flushOfflineQueue();
      });

      socket.on("disconnect", () => {
        socketConnected = false;
      });

      socket.on("connect_error", () => {
        socketConnected = false;
      });
    };

    ioScript.onerror = () => {
      console.warn("SentientLog: Could not load Socket.IO. Using HTTP fallback.");
      useHttpFallback = true;
    };

    document.head.appendChild(ioScript);
  }

  // ── 1. Page View Tracking ──
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

  // SPA navigation
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

  // ── 2. Click Tracking ──
  let lastClickTime = 0;
  document.addEventListener(
    "click",
    (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300) return;
      lastClickTime = now;

      const target = e.target;
      const tag = target.tagName?.toLowerCase() || "unknown";
      const text = (target.textContent || "").trim().substring(0, 50);
      const id = target.id || "";
      const className =
        target.className && typeof target.className === "string"
          ? target.className.split(" ").slice(0, 2).join(" ")
          : "";

      const isInteractive =
        ["button", "a", "input", "select", "textarea", "label"].includes(
          tag
        ) || target.closest('button, a, [role="button"]');
      if (!isInteractive) return;

      trackEvent({
        event_type: "click",
        url: window.location.href,
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
    },
    true
  );

  // ── 3. API Latency Tracking ──
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const urlStr =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : args[0].url;

    // Don't track our own requests
    if (
      urlStr.includes("/api/v1/ingest") ||
      urlStr.includes("/socket.io")
    ) {
      return originalFetch.apply(this, args);
    }

    const start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const latency = Math.round(performance.now() - start);

      trackEvent({
        event_type: "api_call",
        url:
          urlStr.length > 100 ? urlStr.substring(0, 100) + "..." : urlStr,
        latency_ms: latency,
        status_code: response.status,
        metadata: {
          method: (args[1]?.method || "GET").toUpperCase(),
          browser: getBrowserName(),
          device: getDeviceType(),
        },
      });
      return response;
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      trackEvent({
        event_type: "error",
        url:
          urlStr.length > 100 ? urlStr.substring(0, 100) + "..." : urlStr,
        latency_ms: latency,
        status_code: 0,
        metadata: {
          message: `Fetch failed: ${err.message || "unknown"}`,
          method: (args[1]?.method || "GET").toUpperCase(),
          browser: getBrowserName(),
          device: getDeviceType(),
        },
      });
      throw err;
    }
  };

  // ── 4. Error Tracking ──
  window.addEventListener("error", (event) => {
    trackEvent({
      event_type: "error",
      url: window.location.href,
      latency_ms: 0,
      status_code: 500,
      metadata: {
        message: event.message?.substring(0, 200),
        filename: event.filename?.split("/").pop(),
        browser: getBrowserName(),
        device: getDeviceType(),
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    trackEvent({
      event_type: "error",
      url: window.location.href,
      latency_ms: 0,
      status_code: 500,
      metadata: {
        message: `Unhandled Promise: ${reason.substring(0, 200)}`,
        browser: getBrowserName(),
        device: getDeviceType(),
      },
    });
  });







  // ── Flush on page unload ──
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (useHttpFallback) {
        httpFlush();
      } else if (socket && socketConnected && offlineQueue.length > 0) {
        flushOfflineQueue();
      }
    }
  });

  // ── Initialize ──
  initSocket();
})();
