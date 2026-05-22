import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { getUserId } from "@/lib/getUser";
import { crawlPage, normalizeUrl } from "@/services/CrawlerService";

export async function POST(req) {
  try {
    const { url, maxPages = 15 } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let startUrl;
    try {
      startUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    await connectDB();

    const userId = await getUserId();
    console.log("[Analyzer] userId resolved:", userId);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized — could not resolve user" },
        { status: 401 },
      );
    }

    const limit = Math.min(maxPages, 50);
    const visited = new Set();
    const queue = [startUrl.toString()];
    const results = [];
    const domain = startUrl.hostname;
    const sessionId = `analyze_${domain}_${Date.now()}`;

    // BFS crawl — single fetch per URL, extract links in same pass
    while (queue.length > 0 && results.length < limit) {
      const currentUrl = queue.shift();
      const normalized = normalizeUrl(currentUrl);

      if (visited.has(normalized)) continue;
      visited.add(normalized);

      console.log(
        `[Analyzer] Crawling (${results.length + 1}/${limit}): ${normalized}`,
      );

      const { result, links } = await crawlPage(currentUrl);
      results.push(result);

      // Add discovered links to queue
      for (const link of links) {
        const normLink = normalizeUrl(link);
        if (
          !visited.has(normLink) &&
          !queue.some((q) => normalizeUrl(q) === normLink)
        ) {
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
      event_type: r.error
        ? "error"
        : r.status_code >= 400
          ? "error"
          : "page_view",
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
        source: "website_analyzer",
        domain: domain,
        error: r.error || undefined,
      },
    }));

    // Also store as api_call events for latency tracking
    const apiEvents = results
      .filter((r) => !r.error && r.status_code > 0)
      .map((r) => ({
        event_type: "api_call",
        url: `${domain}${r.path}`,
        latency_ms: r.latency_ms,
        status_code: r.status_code,
        session_id: sessionId,
        user_id: userId,
        timestamp: new Date(),
        metadata: {
          method: "GET",
          content_type: r.content_type,
          size_bytes: r.size_bytes,
          source: "website_analyzer",
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
        avg_latency: Math.round(
          results.reduce((s, r) => s + r.latency_ms, 0) / results.length,
        ),
        errors: results.filter((r) => r.error || r.status_code >= 400).length,
        fastest: Math.min(...results.map((r) => r.latency_ms)),
        slowest: Math.max(...results.map((r) => r.latency_ms)),
        total_size: `${(results.reduce((s, r) => s + r.size_bytes, 0) / 1024).toFixed(0)}KB`,
      },
    });
  } catch (error) {
    console.error("Analyze error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 },
    );
  }
}
