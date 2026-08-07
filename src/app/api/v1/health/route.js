import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";

export async function GET() {
  try {
    await connectDB();
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    
    // Debugging: fetch latest 5 events
    const latestEvents = await Event.find().sort({ timestamp: -1 }).limit(5).lean();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      latestEvents
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
