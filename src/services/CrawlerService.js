import axios from "axios";

// Extract all links from HTML
export function extractLinks(html, baseUrl) {
  const linkRegex = /href\s*=\s*["']([^"'#]+?)["']/gi;
  const links = new Set();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1].trim();
      if (!href) continue;
      if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("data:")
      )
        continue;

      const resolved = new URL(href, baseUrl);
      const base = new URL(baseUrl);

      // Only same-origin links
      if (resolved.hostname !== base.hostname) continue;

      // Skip common non-page resources
      const ext = resolved.pathname.split(".").pop()?.toLowerCase() || "";
      const skipExts = [
        "css", "js", "png", "jpg", "jpeg", "gif", "svg", "ico",
        "woff", "woff2", "ttf", "eot", "pdf", "zip", "mp4", "mp3",
      ];
      if (skipExts.includes(ext)) continue;

      // Clean URL: remove hash, keep query params (they matter for dynamic sites)
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // Invalid URL
    }
  }

  return Array.from(links);
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim().substring(0, 120) : "";
}

// Single fetch that returns everything we need
export async function crawlPage(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const start = performance.now();
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "identity",
          "Cache-Control": "no-cache",
        },
        maxRedirects: 5,
        timeout: 12000,
        responseType: 'text',
      });

      const latency = Math.round(performance.now() - start);
      const contentType = (response.headers["content-type"] || "unknown")
        .split(";")[0]
        .trim();
      const body = response.data;
      const isHtml =
        contentType.includes("html") || (typeof body === 'string' && body.trimStart().startsWith("<"));

      const parsedUrl = new URL(url);
      const title = isHtml ? extractTitle(body) : "";
      const discoveredLinks = isHtml ? extractLinks(body, url) : [];

      return {
        result: {
          url,
          path: parsedUrl.pathname + parsedUrl.search,
          status_code: response.status,
          latency_ms: latency,
          content_type: contentType,
          page_title: title,
          links_found: discoveredLinks.length,
          size_bytes: body.length,
        },
        links: discoveredLinks,
      };
    } catch (err) {
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      const latency = Math.round(performance.now() - start);
      const parsedUrl = new URL(url);
      return {
        result: {
          url,
          path: parsedUrl.pathname + parsedUrl.search,
          status_code: 0,
          latency_ms: latency,
          content_type: "error",
          page_title: "",
          links_found: 0,
          size_bytes: 0,
          error: err instanceof Error ? err.message : "Request failed",
        },
        links: [],
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    result: {
      url,
      path: new URL(url).pathname,
      status_code: 0,
      latency_ms: 0,
      content_type: "error",
      page_title: "",
      links_found: 0,
      size_bytes: 0,
      error: "Max retries exceeded",
    },
    links: [],
  };
}

// Normalize URL for deduplication
export function normalizeUrl(u) {
  try {
    const parsed = new URL(u);
    // Remove trailing slash except for root
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return u;
  }
}
