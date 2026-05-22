import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/models/Alert";
import { AlertHistory } from "@/models/AlertHistory";
import { getUserId } from "@/lib/getUser";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    console.error("Alert PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const alert = await Alert.findOneAndDelete({ _id: id, user_id: userId });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Also delete associated firing history
    await AlertHistory.deleteMany({ alert_id: id });

    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Alert DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 },
    );
  }
}
