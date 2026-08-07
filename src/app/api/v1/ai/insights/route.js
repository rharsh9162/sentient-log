import { NextResponse } from "next/server";
import { AnalyticAgent } from "@/services/AnalyticAgent";
import { getUserId } from "@/lib/getUser";

const agent = new AnalyticAgent();

export async function GET(req) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || "";

    const insights = await agent.getInsights(domain, userId);
    return NextResponse.json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Insights API error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
