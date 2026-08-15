import { NextResponse } from "next/server";
import { AnalyticAgent } from "@/services/AnalyticAgent";
import { withApiHandler } from "@/lib/api-handler";

const agent = new AnalyticAgent();

export const GET = withApiHandler(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") || "";

  const insights = await agent.getInsights(domain, userId);
  return NextResponse.json({ insights });
});
