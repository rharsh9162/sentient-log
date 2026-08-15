import { NextResponse } from "next/server";
import { Event } from "@/models/Event";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (req, { userId }) => {
  const { action } = await req.json();

  if (action === "clear_orphaned") {
    // Delete all events that have no user_id (old data from before user isolation)
    const result = await Event.deleteMany({ user_id: { $exists: false } });
    const result2 = await Event.deleteMany({ user_id: null });
    return NextResponse.json({
      message: `Cleared ${result.deletedCount + result2.deletedCount} orphaned events`,
      deleted: result.deletedCount + result2.deletedCount,
    });
  }

  if (action === "clear_mine") {
    // Delete all events for the current user
    const result = await Event.deleteMany({ user_id: userId });
    return NextResponse.json({
      message: `Cleared ${result.deletedCount} of your events`,
      deleted: result.deletedCount,
    });
  }

  if (action === "clear_all") {
    // Delete ALL events (admin action)
    const result = await Event.deleteMany({});
    return NextResponse.json({
      message: `Cleared all ${result.deletedCount} events`,
      deleted: result.deletedCount,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
