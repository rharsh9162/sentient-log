import mongoose, { Schema } from "mongoose";

const EventSchema = new Schema(
  {
    event_type: {
      type: String,
      required: true,
      enum: ["page_view", "click", "error", "api_call"],
    },
    url: { type: String, required: true },
    latency_ms: { type: Number, required: true },
    status_code: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
    session_id: { type: String },
    user_id: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

EventSchema.index({ timestamp: -1 });
EventSchema.index({ url: 1 });
EventSchema.index({ event_type: 1 });

export const Event =
  mongoose.models.Event || mongoose.model("Event", EventSchema);
