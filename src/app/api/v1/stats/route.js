import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") || "";

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const baseFilter = { user_id: userId };
  if (domain) baseFilter["metadata.domain"] = domain;

  const timeFilter = {
    ...baseFilter,
    timestamp: { $gte: twentyFourHoursAgo },
  };

  const [domains, uniqueUrls, eventsPerHour, facetResult] = await Promise.all([
    Event.distinct("metadata.domain", { user_id: userId }).then(d => d.filter(Boolean)),
    Event.distinct("url", baseFilter).then(urls => urls.length),
    Event.aggregate([
      { $match: timeFilter },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: "$_id", count: 1 } }
    ]),
    Event.aggregate([
      { $match: baseFilter },
      { $facet: {
          totals: [
            { $group: { 
                _id: null, 
                total: { $sum: 1 }, 
                errors: { $sum: { $cond: [{ $eq: ["$event_type", "error"] }, 1, 0] } }, 
                avgLatency: { $avg: "$latency_ms" } 
            } }
          ],
          topUrls: [
            { $group: { _id: "$url", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, url: "$_id", count: 1 } }
          ],
          eventTypes: [
            { $group: { _id: "$event_type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, type: "$_id", count: 1 } }
          ],
          latencyUrls: [
            { $group: { _id: "$url", avg_latency: { $avg: "$latency_ms" } } },
            { $sort: { avg_latency: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, url: "$_id", avg_latency: { $round: ["$avg_latency", 0] } } }
          ]
      }}
    ])
  ]);

  const totals = facetResult[0]?.totals[0] || { total: 0, errors: 0, avgLatency: 0 };

  return NextResponse.json({
    total_events: totals.total,
    avg_latency: Math.round(totals.avgLatency || 0),
    error_count: totals.errors,
    unique_urls: uniqueUrls,
    events_per_hour: eventsPerHour,
    top_urls: facetResult[0]?.topUrls || [],
    event_type_breakdown: facetResult[0]?.eventTypes || [],
    avg_latency_per_url: facetResult[0]?.latencyUrls || [],
    domains: domains,
  });
});
