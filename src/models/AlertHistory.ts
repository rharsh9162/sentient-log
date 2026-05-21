import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertHistory {
  alert_id: mongoose.Types.ObjectId;
  user_id: string;
  rule_name: string;
  domain: string;
  metric: string;
  measured_value: number;
  threshold: number;
  fired_at: Date;
}

export interface AlertHistoryDocument extends IAlertHistory, Document {}

const AlertHistorySchema = new Schema<AlertHistoryDocument>(
  {
    alert_id: { type: Schema.Types.ObjectId, ref: 'Alert', required: true, index: true },
    user_id: { type: String, required: true, index: true },
    rule_name: { type: String, required: true },
    domain: { type: String, required: true },
    metric: { type: String, required: true },
    measured_value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    fired_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AlertHistorySchema.index({ fired_at: -1 });

export const AlertHistory =
  mongoose.models.AlertHistory || mongoose.model<AlertHistoryDocument>('AlertHistory', AlertHistorySchema);
