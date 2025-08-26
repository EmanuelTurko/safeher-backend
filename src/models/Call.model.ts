import mongoose, { Schema, Document } from "mongoose";

export interface ICall extends Document {
  requesterId: mongoose.Types.ObjectId;
  helperId: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId; // Identifier of the helper request that preceded the call
  idempotencyKey?: string; // Prevent duplicate creation
  status: "active" | "ended" | "disconnected";
  startedAt: Date;
  endedAt?: Date;
  endedBy?: mongoose.Types.ObjectId; // Who disconnected the call
  duration?: number; // Call duration in seconds
  callId?: string; // External call identifier (e.g., Twilio)
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
    type: Number, // Call duration in seconds
  },
  callId: {
    type: String, // External call identifier (e.g., Twilio)
  },
});

// Indexes for better performance
CallSchema.index({ requesterId: 1, status: 1 });
CallSchema.index({ helperId: 1, status: 1 });
CallSchema.index({ status: 1, startedAt: -1 });
CallSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
CallSchema.index({ requestId: 1, status: 1 });

export default mongoose.model<ICall>("Call", CallSchema);
