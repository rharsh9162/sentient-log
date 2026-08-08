import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { getUserId } from "@/lib/getUser";

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 200 });
  return setCorsHeaders(res);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      const res = NextResponse.json(
        { error: "events array is required and must not be empty" },
        { status: 400 },
      );
      return setCorsHeaders(res);
    }

    // Determine target user ID (from query param for external tracking, or active session for internal)
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    let targetUserId = siteId;

    if (!targetUserId) {
      targetUserId = await getUserId(); // Fallback to current authenticated user
    }

    // Tag events with user_id for data isolation
    const taggedEvents = events.map((e) => ({
      ...e,
      user_id: targetUserId || undefined,
      timestamp: e.timestamp || new Date(),
    }));

    // In a Vercel Serverless environment, background intervals (like BatchIngester) 
    // will be frozen before they can flush. We must write directly to the DB.
    await connectDB();
    await Event.insertMany(taggedEvents, { ordered: false });

    const res = NextResponse.json(
      { accepted: taggedEvents.length },
      { status: 202 },
    );
    return setCorsHeaders(res);
  } catch (error) {
    console.error("Ingest error:", error);
    const res = NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
    return setCorsHeaders(res);
  }
}
