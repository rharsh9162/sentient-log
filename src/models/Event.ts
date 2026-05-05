import mongoose, { Schema, Document } from 'mongoose';

export type EventType = 'page_view' | 'click' | 'error' | 'api_call';

export interface ILogEvent {
  event_type: EventType;
  url: string;
  latency_ms: number;
  status_code?: number;
  metadata?: Record<string, unknown>;
  session_id?: string;
  user_id?: string;
  timestamp?: Date;
}

export interface EventDocument extends ILogEvent, Document {}

const EventSchema = new Schema<EventDocument>(
  {
    event_type: {
      type: String,
      required: true,
      enum: ['page_view', 'click', 'error', 'api_call'],
    },
    url: { type: String, required: true },
    latency_ms: { type: Number, required: true },
    status_code: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
    session_id: { type: String },
    user_id: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

EventSchema.index({ timestamp: -1 });
EventSchema.index({ url: 1 });
EventSchema.index({ event_type: 1 });

export const Event =
  mongoose.models.Event || mongoose.model<EventDocument>('Event', EventSchema);
