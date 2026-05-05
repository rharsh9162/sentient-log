import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { getUserId } from '@/lib/getUser';

interface CrawlResult {
  url: string;
  path: string;
  status_code: number;
  latency_ms: number;
  content_type: string;
  page_title: string;
  links_found: number;
  size_bytes: number;
  error?: string;
}

// Extract all links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href\s*=\s*["']([^"'#]+?)["']/gi;
  const links: Set<string> = new Set();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1].trim();
      if (!href) continue;
      if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) continue;

      const resolved = new URL(href, baseUrl);
      const base = new URL(baseUrl);

      // Only same-origin links
      if (resolved.hostname !== base.hostname) continue;

      // Skip common non-page resources
      const ext = resolved.pathname.split('.').pop()?.toLowerCase() || '';
      const skipExts = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'mp4', 'mp3'];
      if (skipExts.includes(ext)) continue;

      // Clean URL: remove hash, keep query params (they matter for dynamic sites)
      resolved.hash = '';
      links.add(resolved.toString());
    } catch {
      // Invalid URL
    }
  }

  return Array.from(links);
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim().substring(0, 120) : '';
}

// Single fetch that returns everything we need
async function crawlPage(url: string, retries = 2): Promise<{ result: CrawlResult; links: string[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);
      const latency = Math.round(performance.now() - start);
      const contentType = (response.headers.get('content-type') || 'unknown').split(';')[0].trim();
      const body = await response.text();
      const isHtml = contentType.includes('html') || body.trimStart().startsWith('<');

      const parsedUrl = new URL(url);
      const title = isHtml ? extractTitle(body) : '';
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
          content_type: 'error',
          page_title: '',
          links_found: 0,
          size_bytes: 0,
          error: err instanceof Error ? err.message : 'Request failed',
        },
        links: [],
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    result: {
      url, path: new URL(url).pathname, status_code: 0, latency_ms: 0,
      content_type: 'error', page_title: '', links_found: 0, size_bytes: 0,
      error: 'Max retries exceeded',
    },
    links: [],
  };
}

// Normalize URL for deduplication
function normalizeUrl(u: string): string {
  try {
    const parsed = new URL(u);
    // Remove trailing slash except for root
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return u;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, maxPages = 15 } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let startUrl: URL;
    try {
      startUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    await connectDB();

    const userId = await getUserId();
    console.log('[Analyzer] userId resolved:', userId);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized — could not resolve user' }, { status: 401 });
    }

    const limit = Math.min(maxPages, 50);
    const visited = new Set<string>();
    const queue: string[] = [startUrl.toString()];
    const results: CrawlResult[] = [];
    const domain = startUrl.hostname;
    const sessionId = `analyze_${domain}_${Date.now()}`;

    // BFS crawl — single fetch per URL, extract links in same pass
    while (queue.length > 0 && results.length < limit) {
      const currentUrl = queue.shift()!;
      const normalized = normalizeUrl(currentUrl);

      if (visited.has(normalized)) continue;
      visited.add(normalized);

      console.log(`[Analyzer] Crawling (${results.length + 1}/${limit}): ${normalized}`);

      const { result, links } = await crawlPage(currentUrl);
      results.push(result);

      // Add discovered links to queue
      for (const link of links) {
        const normLink = normalizeUrl(link);
        if (!visited.has(normLink) && !queue.some((q) => normalizeUrl(q) === normLink)) {
          queue.push(link);
        }
      }

      // Small delay between requests to be polite
      if (queue.length > 0 && results.length < limit) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    // Build events — store full domain-qualified URLs so they're identifiable
    const events = results.map((r) => ({
      event_type: r.error ? 'error' : r.status_code >= 400 ? 'error' : 'page_view',
      url: `${domain}${r.path}`,
      latency_ms: r.latency_ms,
      status_code: r.status_code || 0,
      session_id: sessionId,
      user_id: userId,
      timestamp: new Date(),
      metadata: {
        full_url: r.url,
        page_title: r.page_title || undefined,
        content_type: r.content_type,
        links_found: r.links_found,
        size_bytes: r.size_bytes,
        source: 'website_analyzer',
        domain: domain,
        error: r.error || undefined,
      },
    }));

    // Also store as api_call events for latency tracking
    const apiEvents = results
      .filter((r) => !r.error && r.status_code > 0)
      .map((r) => ({
        event_type: 'api_call' as const,
        url: `${domain}${r.path}`,
        latency_ms: r.latency_ms,
        status_code: r.status_code,
        session_id: sessionId,
        user_id: userId,
        timestamp: new Date(),
        metadata: {
          method: 'GET',
          content_type: r.content_type,
          size_bytes: r.size_bytes,
          source: 'website_analyzer',
          domain: domain,
        },
      }));

    const allEvents = [...events, ...apiEvents];
    if (allEvents.length > 0) {
      await Event.insertMany(allEvents);
    }

    return NextResponse.json({
      message: `Analyzed ${results.length} pages from ${domain}`,
      domain,
      pages_crawled: results.length,
      events_created: allEvents.length,
      session_id: sessionId,
      results: results.map((r) => ({
        url: r.url,
        path: r.path,
        status: r.status_code,
        latency: `${r.latency_ms}ms`,
        title: r.page_title,
        links: r.links_found,
        size: `${(r.size_bytes / 1024).toFixed(1)}KB`,
        error: r.error,
      })),
      summary: {
        avg_latency: Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / results.length),
        errors: results.filter((r) => r.error || r.status_code >= 400).length,
        fastest: Math.min(...results.map((r) => r.latency_ms)),
        slowest: Math.max(...results.map((r) => r.latency_ms)),
        total_size: `${(results.reduce((s, r) => s + r.size_bytes, 0) / 1024).toFixed(0)}KB`,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
