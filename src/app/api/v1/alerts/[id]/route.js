import { NextResponse } from "next/server";
import { Alert } from "@/models/Alert";
import { AlertHistory } from "@/models/AlertHistory";
import { withApiHandler } from "@/lib/api-handler";

export const PATCH = withApiHandler(async (req, { userId, params }) => {
  const { id } = await params;
  const updates = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    "name",
    "domain",
    "metric",
    "condition",
    "threshold",
    "frequency",
    "enabled",
  ];
  const sanitized = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitized[key] = updates[key];
    }
  }

  const alert = await Alert.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: sanitized },
    { new: true },
  );

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ alert });
});

export const DELETE = withApiHandler(async (_req, { userId, params }) => {
  const { id } = await params;

  const alert = await Alert.findOneAndDelete({ _id: id, user_id: userId });
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Also delete associated firing history
  await AlertHistory.deleteMany({ alert_id: id });

  return NextResponse.json({ message: "Alert deleted successfully" });
});
