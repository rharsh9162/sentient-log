/**
 * SentientLog — Embeddable Tracking Snippet
 *
 * Add this script tag to ANY website to send real analytics data
 * back to your SentientLog dashboard:
 *
 *   <script src="http://localhost:3000/tracker.js" data-endpoint="http://localhost:3000/api/v1/ingest"></script>
 *
 * It will automatically capture:
 *   • Page views (+ load time)
 *   • Clicks on interactive elements
 *   • JavaScript errors
 *   • Fetch/XHR API call latencies
 */

(function () {
  'use strict';

  var ENDPOINT = document.currentScript
    ? document.currentScript.getAttribute('data-endpoint') || '/api/v1/ingest'
    : '/api/v1/ingest';

  var SESSION_ID = 'sess_' + Math.random().toString(36).substring(2, 10);
  var buffer = [];
  var flushTimer = null;

  // ---- Utilities ----
  function getBrowser() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Other';
  }

  function getDevice() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  // ---- Event Buffer ----
  function track(event) {
    event.session_id = SESSION_ID;
    event.timestamp = new Date().toISOString();
    event.metadata = event.metadata || {};
    event.metadata.browser = getBrowser();
    event.metadata.device = getDevice();
    event.metadata.source = window.location.hostname;
    buffer.push(event);

    if (buffer.length >= 10) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(function () {
        flushTimer = null;
        flush();
      }, 3000);
    }
  }

  function flush() {
    if (buffer.length === 0) return;
    var batch = buffer.splice(0);
    var payload = JSON.stringify({ events: batch });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', ENDPOINT, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    }
  }

  // ---- Page View ----
  track({
    event_type: 'page_view',
    url: window.location.pathname,
    latency_ms: Math.round(performance.now()),
    status_code: 200,
    metadata: {
      referrer: document.referrer || 'direct',
      title: document.title,
      full_url: window.location.href,
    },
  });

  // SPA: track popstate (back/forward) navigation
  window.addEventListener('popstate', function () {
    track({
      event_type: 'page_view',
      url: window.location.pathname,
      latency_ms: 0,
      status_code: 200,
      metadata: { nav_type: 'popstate', title: document.title },
    });
  });

  // ---- Click Tracking ----
  var lastClick = 0;
  document.addEventListener(
    'click',
    function (e) {
      var now = Date.now();
      if (now - lastClick < 300) return;
      lastClick = now;

      var el = e.target;
      var interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];

      // Walk up to find the nearest interactive element
      var interactive = el;
      for (var i = 0; i < 5 && interactive; i++) {
        if (interactiveTags.indexOf((interactive.tagName || '').toLowerCase()) > -1) break;
        if (interactive.getAttribute && interactive.getAttribute('role') === 'button') break;
        interactive = interactive.parentElement;
      }

      if (!interactive || interactiveTags.indexOf((interactive.tagName || '').toLowerCase()) === -1) {
        return;
      }

      track({
        event_type: 'click',
        url: window.location.pathname,
        latency_ms: 0,
        metadata: {
          tag: (interactive.tagName || '').toLowerCase(),
          text: (interactive.textContent || '').trim().substring(0, 50),
          id: interactive.id || undefined,
          href: interactive.href || undefined,
        },
      });
    },
    true
  );

  // ---- Error Tracking ----
  window.addEventListener('error', function (e) {
    track({
      event_type: 'error',
      url: window.location.pathname,
      latency_ms: 0,
      status_code: 500,
      metadata: {
        message: (e.message || '').substring(0, 200),
        filename: (e.filename || '').split('/').pop(),
        line: e.lineno,
      },
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    track({
      event_type: 'error',
      url: window.location.pathname,
      latency_ms: 0,
      status_code: 500,
      metadata: { message: 'Unhandled: ' + reason.substring(0, 200) },
    });
  });

  // ---- API Call Tracking (fetch) ----
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function () {
      var url =
        typeof arguments[0] === 'string'
          ? arguments[0]
          : arguments[0] instanceof URL
          ? arguments[0].toString()
          : arguments[0].url || '';

      // Skip tracking our own ingest calls
      if (url.indexOf('/api/v1/ingest') > -1) {
        return origFetch.apply(this, arguments);
      }

      var start = performance.now();
      var args = arguments;
      return origFetch.apply(this, args).then(
        function (response) {
          var latency = Math.round(performance.now() - start);
          try {
            var parsed = new URL(url, window.location.origin);
            track({
              event_type: 'api_call',
              url: parsed.pathname,
              latency_ms: latency,
              status_code: response.status,
              metadata: {
                method: ((args[1] && args[1].method) || 'GET').toUpperCase(),
              },
            });
          } catch (_e) {
            // ignore URL parse errors
          }
          return response;
        },
        function (err) {
          var latency = Math.round(performance.now() - start);
          track({
            event_type: 'error',
            url: url,
            latency_ms: latency,
            status_code: 0,
            metadata: {
              message: 'Fetch failed: ' + (err.message || 'unknown'),
            },
          });
          throw err;
        }
      );
    };
  }

  // ---- Flush on exit ----
  window.addEventListener('beforeunload', flush);
  window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  console.log('[SentientLog] Tracker active — session:', SESSION_ID);
})();
