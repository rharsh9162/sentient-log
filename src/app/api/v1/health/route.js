import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET() {
  const dbState = mongoose.connection.readyState;
  return NextResponse.json({
    status: "ok",
    db: dbState === 1 ? "connected" : "disconnected",
    uptime_seconds: Math.floor(process.uptime()),
  });
}
