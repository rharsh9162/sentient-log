import { NextResponse } from "next/server";
import { Alert } from "@/models/Alert";
import { AlertHistory } from "@/models/AlertHistory";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, { userId }) => {
  const alerts = await Alert.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .lean();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const firedToday = await AlertHistory.countDocuments({
    user_id: userId,
    fired_at: { $gte: todayStart },
  });

  const totalFirings = await AlertHistory.countDocuments({ user_id: userId });
  const activeCount = alerts.filter((a) => a.enabled).length;

  return NextResponse.json({
    alerts,
    summary: {
      total_rules: alerts.length,
      active: activeCount,
      fired_today: firedToday,
      total_firings: totalFirings,
    },
  });
});

export const POST = withApiHandler(async (req, { userId }) => {
  const { name, domain, metric, condition, threshold, frequency } = await req.json();

  if (!name || !domain || !metric || !threshold) {
    return NextResponse.json(
      { error: "name, domain, metric, and threshold are required" },
      { status: 400 }
    );
  }

  const alert = await Alert.create({
    user_id: userId,
    name,
    domain,
    metric,
    condition: condition || "gt",
    threshold: Number(threshold),
    frequency: frequency || "daily",
    enabled: true,
    last_fired_at: null,
    last_checked_at: null,
    total_firings: 0,
  });

  return NextResponse.json(
    { alert, message: "Alert created successfully" },
    { status: 201 }
  );
});
