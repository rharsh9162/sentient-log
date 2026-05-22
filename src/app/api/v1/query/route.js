import { NextResponse } from "next/server";
import { AnalyticAgent } from "@/services/AnalyticAgent";
import { getUserId } from "@/lib/getUser";

const agent = new AnalyticAgent();

export async function POST(req) {
  try {
    const { question, domain } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "question string is required" },
        { status: 400 },
      );
    }

    const userId = await getUserId();
    const result = await agent.query(
      question,
      domain || undefined,
      userId || undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Query error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
