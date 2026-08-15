import { NextResponse } from "next/server";
import { AlertHistory } from "@/models/AlertHistory";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, { userId }) => {
  const history = await AlertHistory.find({ user_id: userId })
    .sort({ fired_at: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ history });
});
