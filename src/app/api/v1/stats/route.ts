import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { getUserId } from '@/lib/getUser';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || '';

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Build the base filter — scoped to user
    const baseFilter: Record<string, unknown> = {};
    if (userId) baseFilter.user_id = userId;
    if (domain) {
      baseFilter['metadata.domain'] = domain;
    }

    const timeFilter = { ...baseFilter, timestamp: { $gte: twentyFourHoursAgo } };

    const [
      totalEvents,
      eventsPerHour,
      topUrls,
      eventTypeBreakdown,
      avgLatencyPerUrl,
      errorCount,
      avgLatency,
      uniqueUrls,
      domains,
    ] = await Promise.all([
      Event.countDocuments(baseFilter),

      Event.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: '$_id', count: 1 } },
      ]),

      Event.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$url', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, url: '$_id', count: 1 } },
      ]),

      Event.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$event_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),

      Event.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$url', avg_latency: { $avg: '$latency_ms' } } },
        { $sort: { avg_latency: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, url: '$_id', avg_latency: { $round: ['$avg_latency', 0] } } },
      ]),

      Event.countDocuments({ ...baseFilter, event_type: 'error' }),

      Event.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, avg: { $avg: '$latency_ms' } } },
      ]),

      Event.distinct('url', baseFilter).then((urls: string[]) => urls.length),

      // Get all unique domains for the filter dropdown
      Event.distinct('metadata.domain', userId ? { user_id: userId } : {}).then((d: string[]) => d.filter(Boolean)),
    ]);

    return NextResponse.json({
      total_events: totalEvents,
      avg_latency: Math.round(avgLatency[0]?.avg || 0),
      error_count: errorCount,
      unique_urls: uniqueUrls,
      events_per_hour: eventsPerHour,
      top_urls: topUrls,
      event_type_breakdown: eventTypeBreakdown,
      avg_latency_per_url: avgLatencyPerUrl,
      domains: domains, // list of available domains for filtering
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
