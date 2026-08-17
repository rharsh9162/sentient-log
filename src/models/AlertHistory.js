import mongoose, { Schema } from "mongoose";

// Each document in this collection represents one alert firing.
const AlertHistorySchema = new Schema(
  {
    alert_id: {
      type: Schema.Types.ObjectId,
      ref: "Alert",
      required: true,
      index: true,
    },
    user_id: { type: String, required: true, index: true },
    rule_name: { type: String, required: true },
    domain: { type: String, required: true },
    metric: { type: String, required: true },
    measured_value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    fired_at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

AlertHistorySchema.index({ fired_at: -1 });  // This creates an index on fired_at, descending.

export const AlertHistory =
  mongoose.models.AlertHistory ||
  mongoose.model("AlertHistory", AlertHistorySchema);
