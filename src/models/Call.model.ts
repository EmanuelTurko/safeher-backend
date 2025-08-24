import mongoose, { Schema, Document } from "mongoose";

export interface ICall extends Document {
  requesterId: mongoose.Types.ObjectId;
  helperId: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId; // זיהוי בקשת העזרה שקדמה לשיחה
  idempotencyKey?: string; // למניעת יצירה כפולה
  status: "active" | "ended" | "disconnected";
  startedAt: Date;
  endedAt?: Date;
  endedBy?: mongoose.Types.ObjectId; // מי ניתק את השיחה
  duration?: number; // משך השיחה בשניות
  callId?: string; // מזהה השיחה מ-Twilio או שירות אחר
}

const CallSchema: Schema = new Schema<ICall>({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HelperRequest",
    index: true,
  },
  idempotencyKey: {
    type: String,
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "ended", "disconnected"],
    default: "active",
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  endedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  duration: {
    type: Number, // משך השיחה בשניות
  },
  callId: {
    type: String, // מזהה השיחה מ-Twilio או שירות אחר
  },
});

// אינדקסים לביצועים טובים יותר
CallSchema.index({ requesterId: 1, status: 1 });
CallSchema.index({ helperId: 1, status: 1 });
CallSchema.index({ status: 1, startedAt: -1 });
CallSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
CallSchema.index({ requestId: 1, status: 1 });

export default mongoose.model<ICall>("Call", CallSchema);
