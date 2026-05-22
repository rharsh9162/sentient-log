import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { batchIngester } from "@/services/BatchIngester";

export async function GET() {
  const dbState = mongoose.connection.readyState;
  return NextResponse.json({
    status: "ok",
    db: dbState === 1 ? "connected" : "disconnected",
    buffer_size: batchIngester.bufferSize,
    uptime_seconds: Math.floor(process.uptime()),
  });
}
