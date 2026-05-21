import mongoose, { Schema, Document } from 'mongoose';

export type AlertFrequency = '15m' | 'daily' | 'weekly' | 'monthly';

export interface IAlert {
  user_id: string;
  name: string;
  domain: string;
  metric: 'avg_latency' | 'error_rate' | 'slow_pages' | 'total_errors';
  condition: 'gt' | 'lt';
  threshold: number;
  frequency: AlertFrequency;
  enabled: boolean;
  last_fired_at: Date | null;
  last_checked_at: Date | null;
  total_firings: number;
}

export interface AlertDocument extends IAlert, Document {}

const AlertSchema = new Schema<AlertDocument>(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    domain: { type: String, required: true },
    metric: {
      type: String,
      required: true,
      enum: ['avg_latency', 'error_rate', 'slow_pages', 'total_errors'],
    },
    condition: {
      type: String,
      required: true,
      enum: ['gt', 'lt'],
      default: 'gt',
    },
    threshold: { type: Number, required: true },
    frequency: { 
      type: String, 
      required: true, 
      enum: ['15m', 'daily', 'weekly', 'monthly'],
      default: 'daily' 
    },
    enabled: { type: Boolean, default: true },
    last_fired_at: { type: Date, default: null },
    last_checked_at: { type: Date, default: null },
    total_firings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Alert =
  mongoose.models.Alert || mongoose.model<AlertDocument>('Alert', AlertSchema);
