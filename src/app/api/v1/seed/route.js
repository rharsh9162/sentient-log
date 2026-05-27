import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { getUserId } from "@/lib/getUser";

const urls = [
  "/dashboard",
  "/profile",
  "/checkout",
  "/home",
  "/settings",
  "/api/users",
  "/products",
  "/cart",
  "/search",
  "/about",
];
const types = ["page_view", "click", "error", "api_call"];
const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
const devices = ["desktop", "mobile", "tablet"];

export async function POST(_req) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seeding disabled in production" },
      { status: 403 },
    );
  }

  try {
    await connectDB();

    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only delete this user's seed data, not everyone's
    await Event.deleteMany({
      user_id: userId,
      "metadata.source": { $ne: "website_analyzer" },
    });

    const events = Array.from({ length: 500 }, () => ({
      event_type: types[Math.floor(Math.random() * types.length)],
      url: urls[Math.floor(Math.random() * urls.length)],
      latency_ms: Math.floor(Math.random() * 1000) + 50,
      status_code: Math.random() > 0.85 ? 500 : Math.random() > 0.1 ? 200 : 404,
      timestamp: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
      session_id: `sess_${Math.random().toString(36).substring(2, 10)}`,
      user_id: userId,
      metadata: {
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        device: devices[Math.floor(Math.random() * devices.length)],
      },
    }));

    await Event.insertMany(events);

    return NextResponse.json({
      message: `Successfully seeded ${events.length} events for your account`,
      count: events.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}
