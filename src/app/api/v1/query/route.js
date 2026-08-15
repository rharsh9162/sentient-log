import { NextResponse } from "next/server";
import { AnalyticAgent } from "@/services/AnalyticAgent";
import { withApiHandler } from "@/lib/api-handler";

const agent = new AnalyticAgent();

export const POST = withApiHandler(async (req, { userId }) => {
  const { question, domain } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  const result = await agent.query(question, domain || undefined, userId || undefined);
  return NextResponse.json(result);
});
