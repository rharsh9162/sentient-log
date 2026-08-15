import { NextResponse } from "next/server";
import { runAlertChecks } from "@/services/AlertChecker";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (_req, { userId }) => {
  const result = await runAlertChecks(userId);
  return NextResponse.json(result);
});
