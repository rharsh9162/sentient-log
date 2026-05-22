import { NextResponse } from "next/server";
import { batchIngester } from "@/services/BatchIngester";
import { getUserId } from "@/lib/getUser";

export async function POST(req) {
  try {
    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Tag events with user_id for data isolation
    const userId = await getUserId();
    const taggedEvents = events.map((e) => ({
      ...e,
      user_id: userId || undefined,
    }));

    batchIngester.add(taggedEvents);

    return NextResponse.json(
      { accepted: taggedEvents.length, buffered: batchIngester.bufferSize },
      { status: 202 },
    );
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
