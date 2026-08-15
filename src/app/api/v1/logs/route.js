import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const event_type = searchParams.get("event_type");
  const search = searchParams.get("search");
  const domain = searchParams.get("domain");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  const filter = { user_id: userId };
  if (event_type) filter.event_type = event_type;
  if (search) filter.url = { $regex: search, $options: "i" };
  if (domain) filter["metadata.domain"] = domain;
  if (start_date || end_date) {
    filter.timestamp = {};
    if (start_date) filter.timestamp.$gte = new Date(start_date);
    if (end_date) filter.timestamp.$lte = new Date(end_date);
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return NextResponse.json({
    events,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});
