import mongoose, { Schema } from "mongoose";

const EventSchema = new Schema(  // This creates a schema named EventSchema.
  {
    event_type: {
      type: String,
      required: true,
      enum: [
        "page_view",
        "click",
        "error",
        "api_call",
      ],
    },
    url: { type: String, required: true },
    latency_ms: { type: Number, required: true },
    status_code: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} }, // This is a flexible object for extra information.
    session_id: { type: String },
    user_id: { type: String, index: true },  //means MongoDB should optimize lookups by user_id.
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

EventSchema.index({ timestamp: -1 });  // This creates an index on timestamp.
// -1 means descending order.
// This helps queries that sort newest events first
EventSchema.index({ url: 1 });   // This creates an index on URL.
EventSchema.index({ event_type: 1 });   // This creates an index on event type.
  
export const Event =
  mongoose.models.Event || mongoose.model("Event", EventSchema);
  // checks if the model already exists , if yes , reuse it , else creates it 
