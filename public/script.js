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
    document.querySelector('script[src*="script.js"]') ||  // searches the page for a <script> whose src contains the text : script.js
    document.querySelector('script[data-site-id]'); // searches for any script having: data-site-id
  const siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  const customSocketUrl = scriptTag ? scriptTag.getAttribute("data-socket") : null;
  const isInternal = scriptTag
    ? scriptTag.hasAttribute("data-internal")  // Your own dashboard loads the same tracker
    : false;
  let scriptOrigin = window.location.origin;  // currently website's origin (https://example.com) // The code initially assumes the tracker and backend are hosted on the same origin as the page
  if (scriptTag && scriptTag.src) {
    try {
      scriptOrigin = new URL(scriptTag.src, window.location.origin).origin;
    } catch (e) {
      // Fallback if parsing fails
    }
  }
  // This allows the tracker to be hosted on a different server from the website being monitored

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
  let socket = null;   // Later, it stores the Socket.IO client connection object
  
  const SOCKET_URL = customSocketUrl || scriptOrigin;

  // ── HTTP Fallback (used if Socket.IO fails to load) ── USE HTTP POST 
  const ingestUrl = `${scriptOrigin}/api/v1/ingest?siteId=${siteId || ""}`;
  
  
  let useHttpFallback = false;  // Initially false because the tracker first attempts to use Socket.IO. It becomes true if Socket.IO fails to load
  const httpBuffer = [];  // Stores events waiting to be sent through HTTP
  let httpFlushTimer = null;  // Stores the timer created by setTimeout(). It prevents creating many different timers at the same time


// Sending buffered HTTP events
  function httpFlush() {
    if (httpBuffer.length === 0) return;
    const batch = httpBuffer.splice(0);  // empty the httpBuffer and assign its value to batch
    fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },  // So this header is important because it says: “the reuest body is JSON”
      body: JSON.stringify({ events: batch }),   // JSON text 
      keepalive: true,  // This tells the browser to try to finish the request even if page is being closed or navigated away 
    }).catch(() => { });  // silently ignores network errors 
  }

  // You don't send every event immediately.
  // events can accumulate for 2 seconds.
  function httpScheduleFlush() {
    if (httpFlushTimer) return;
    httpFlushTimer = setTimeout(() => {
      httpFlushTimer = null;
      httpFlush();
    }, 2000);
  }  // This batches multiple events into one request

  // ── Browser detection ──
  function getBrowserName() {
    const ua = navigator.userAgent;   // a browser-provided string describing the browser
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
    const ref = document.referrer; // contains the previous page that sent the user to the current page.
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
      // If the hostname is not one of these known services, the hostname itself is returned
    } catch {
      return "other";
    }
  }


// Reading UTM campaign parameters : read more about it on Google...
  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    // If the current URL is: https://example.com/?utm_source=google&utm_medium=cpc
    //     then: window.location.search returns: ?utm_source=google&utm_medium=cpc
    const utm = {};
    if (params.get("utm_source")) utm.utm_source = params.get("utm_source");
    if (params.get("utm_medium")) utm.utm_medium = params.get("utm_medium");
    if (params.get("utm_campaign"))
      utm.utm_campaign = params.get("utm_campaign");
    return Object.keys(utm).length > 0 ? utm : undefined;
  }

  // ── Core: trackEvent ──
  // Every feature eventually creates an event and passes it to this function
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

    if (useHttpFallback) {   // If Socket.IO failed, the event goes into httpBuffer
      httpBuffer.push(enrichedEvent);
      // two conditions can cause sending 
      if (httpBuffer.length >= 20) {   // Buffer reaches 20 events 
        httpFlush();
      } else {    // fewer than 20 events (tracker waits 2 secs and sends the current batch)
        httpScheduleFlush();
      }
      return;
    }

    if (socket && socketConnected) {  // If a Socket.IO object exists and is connected
      socket.emit("event", enrichedEvent);  // ends an event named "event" to the server
      // The server must have a matching listener for that event
    } else {  // If Socket.IO is not ready, the event goes into:
      offlineQueue.push(enrichedEvent);
      // This prevents events from being lost during initial loading or temporary disconnection
    }
  }

  function flushOfflineQueue() {
    if (!socket || !socketConnected || offlineQueue.length === 0) return;
    const batch = offlineQueue.splice(0);
    socket.emit("event", batch);  // Here batch is an array, unlike the normal single-event call (enrichedEvent)
  }

  // ── Socket.IO Connection ──
  function initSocket() {
    // Socket.IO client is loaded from the server automatically at /socket.io/socket.io.js
    const ioScript = document.createElement("script");
    ioScript.src = `${SOCKET_URL}/socket.io/socket.io.js`;
    ioScript.async = true;   // allows the browser to load it asynchronously without blocking the page

    ioScript.onload = () => { // This callback runs when the Socket.IO client script finishes loading
      if (typeof io === "undefined") {
      // The Socket.IO script should create a global function called io.
      // if io is missing, the script loaded but did not initialize correctly. The tracker switches to HTTP mode
        console.warn("SentientLog: Socket.IO client failed to initialize. Using HTTP fallback.");
        useHttpFallback = true;
        return;
      }

      // Creating the Socket.IO connection
      socket = io(`${SOCKET_URL}/stream`, {   // This connects to the /stream Socket.IO namespace
        query: { siteId: siteId || "" },  // sends the site ID during the connection handshake. The server can use it to associate the socket with a specific website or user
        transports: ["websocket", "polling"],  // Socket.IO attempts WebSockets first. If WebSockets are unavailable, it can use HTTP long-polling
        reconnection: true,  // automatically tries to reconnect after disconnection
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {  // when the connection succeeds , Queued events are sent 
        socketConnected = true;
        flushOfflineQueue();
      });

      socket.on("disconnect", () => { // when the server/network diconnects , the events will then enter the offline queue 
        socketConnected = false;
      });

      socket.on("connect_error", () => {  // if a connection attempt fails...
        socketConnected = false;
      });
    };

    ioScript.onerror = () => {  // This runs when the browser cannot download the Socket.IO client script
      console.warn("SentientLog: Could not load Socket.IO. Using HTTP fallback.");
      useHttpFallback = true;
    };


    document.head.appendChild(ioScript);  // Creating a script element is not enough.
    // Appending it to document.head causes the browser to actually download and execute it
  }

  // ── 1. Page View Tracking ──
  let lastPath = window.location.pathname;  // stores the current path like /dashboard 

  function trackPageView() {  
    trackEvent({
      event_type: "page_view",
      url: window.location.href,  // records the complete current URL 
      latency_ms: 0,
      metadata: { browser: getBrowserName(), device: getDeviceType() },
    });
  }

  // Initial page view
  trackPageView();

  // Tracking SPA navigation
  // Many modern applications are single-page applications. They navigate between pages using: history.pushState() without performing a full browser refresh
  const originalPushState = history.pushState;  // The tracker saves the original function before replacing it.
  history.pushState = function () {
    originalPushState.apply(this, arguments);  // This creates a wrapper around the original navigation function.  calls the real browser behavior while preserving:  The original this , All original arguments
    if (window.location.pathname !== lastPath) {  // checks whether the path changed. If it changed, a new page-view event is created
      lastPath = window.location.pathname;
      trackPageView();
    }
  };

  window.addEventListener("popstate", () => {  // The popstate event occurs when the user uses browser history navigation, such as:  Back button , Forward button
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  });

  // ── 2. Click Tracking ──
  let lastClickTime = 0;
  // This listens for every click on the document
  document.addEventListener(
    "click",
    (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300) return;  // If two clicks happen within 300 milliseconds, the second one is ignored
      lastClickTime = now;

      const target = e.target;  // If two clicks happen within 300 milliseconds, the second one is ignored
      const tag = target.tagName?.toLowerCase() || "unknown";    // like button 
      const text = (target.textContent || "").trim().substring(0, 50);   // This extracts visible text from the clicked element
      const id = target.id || "";  // records the element’s HTML id
      const className =   // This records up to the first two CSS class names
        target.className && typeof target.className === "string"
          ? target.className.split(" ").slice(0, 2).join(" ")
          : "";

      const isInteractive =
        ["button", "a", "input", "select", "textarea", "label"].includes(
          tag
        ) || target.closest('button, a, [role="button"]');  // For example, if the user clicks a <span> inside a <button>, target.closest() finds the surrounding button
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
  //  Tracking API latency by replacing fetch
  const originalFetch = window.fetch;  // This saves the browser’s original fetch function  // The tracker must preserve it because it will wrap window.fetch
  window.fetch = async function (...args) {   // Now every fetch() call made by the website passes through this wrapper
    const urlStr =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : args[0].url;

    // Don't track our own requests (Avoid recursive tracking)
    // tracker sends event -> tracker notices that request -> tracker creates another event -> tracker sends that event -> repeat....
    if (
      urlStr.includes("/api/v1/ingest") ||
      urlStr.includes("/socket.io")
    ) {
      return originalFetch.apply(this, args);
    }

    const start = performance.now();   // performance.now() gives a high-precision timer
    try {
      const response = await originalFetch.apply(this, args);  // The original request is executed. await pauses the wrapper until the request completes.
      const latency = Math.round(performance.now() - start);  // The elapsed time is calculated in milliseconds

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
    } catch (err) {   // this catches network level failures like no internet connection , dns failure , server unreachable
      const latency = Math.round(performance.now() - start);    // Even failed requests have a measured duration.
      trackEvent({
        event_type: "error",
        url:
          urlStr.length > 100 ? urlStr.substring(0, 100) + "..." : urlStr,
        latency_ms: latency,
        status_code: 0,  // A status code of 0 indicates that the browser did not receive a normal HTTP response
        metadata: {
          message: `Fetch failed: ${err.message || "unknown"}`,
          method: (args[1]?.method || "GET").toUpperCase(),
          browser: getBrowserName(),
          device: getDeviceType(),
        },
      });
      throw err;   // The tracker records the error but then rethrows it, so the original application still knows its request failed
    }
  };

  // ── 4. Error Tracking ──
  // This listens for uncaught browser errors.
  window.addEventListener("error", (event) => {
    trackEvent({
      event_type: "error",
      url: window.location.href,
      latency_ms: 0,
      status_code: 500,
      metadata: {
        message: event.message?.substring(0, 200),
        filename: event.filename?.split("/").pop(),
        // extracts only the filename from full script URL 
        // for ex -> https://example.com/assets/app.js  becomes: app.js
        browser: getBrowserName(),
        device: getDeviceType(),
      },
    });
  });



  // Unhandled Promise rejections
  // This detects rejected Promises that do not have a .catch() handler.
  window.addEventListener("unhandledrejection", (event) => {
    // the rejection can be an Error Object , a String , a Number , an arbitary JS object 
    // if it's a error , the message is extracted , else , it's converted into text 
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






  // ── Flushing events when the page becomes hidden ──
  /*
    This event fires when the page becomes visible or hidden.
      The page may become hidden when:
      - The user switches tabs
      - The browser is minimized
      - The user navigates away
      - The page is closed
  */
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      // Only when the page becomes hidden does the tracker attempt to send remaining events.
      if (useHttpFallback) {
        httpFlush();
      } else if (socket && socketConnected && offlineQueue.length > 0) {
        flushOfflineQueue();
      }
    }
  });

  // ── Initialize ──
  // At the very end, the tracker starts loading Socket.IO and establishing the connection
  initSocket();
})();

/*
  This is the complete startup flow:
      Script loads
          ↓
      Find script configuration
          ↓
      Read site ID and internal mode
          ↓
      Create session ID
          ↓
      Track initial page view
          ↓
      Install navigation, click, fetch, and error listeners
          ↓
      Load Socket.IO
          ↓
      Connect to /stream
          ↓
      Flush queued events



_____Complete event flow_____

For a normal click, the flow is:
      User clicks a button
          ↓
      Document click listener runs
          ↓
      Tracker checks whether the element is interactive
          ↓
      Tracker creates a click event
          ↓
      trackEvent() enriches it
          ↓
      Socket.IO sends it immediately



If Socket.IO is not connected:
      User action
          ↓
      trackEvent()
          ↓
      offlineQueue
          ↓
      Socket.IO connects
          ↓
      flushOfflineQueue()
          ↓
      Events sent as a batch

      
If Socket.IO fails completely:
      User action
          ↓
      trackEvent()
          ↓
      httpBuffer
          ↓
      20 events collected or 2 seconds pass
          ↓
      HTTP POST /api/v1/ingest
*/
