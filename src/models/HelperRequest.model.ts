import mongoose, { Schema, Document } from "mongoose";

export interface IHelperRequest extends Document {
  requesterId: mongoose.Types.ObjectId;
  requesterName: string;
  helperIds: mongoose.Types.ObjectId[];
  status: "pending" | "accepted" | "rejected" | "completed" | "expired";
  acceptedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
  responses?: Array<{
    helperId: mongoose.Types.ObjectId;
    response: string;
    respondedAt: Date;
  }>;
}

const HelperRequestSchema: Schema = new Schema<IHelperRequest>({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requesterName: {
    type: String,
    required: true,
  },
  helperIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "completed", "expired"],
    default: "pending",
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  },
  responses: [
    {
      helperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      response: {
        type: String,
        enum: ["accepted", "declined"],
        required: true,
      },
      respondedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default mongoose.model<IHelperRequest>("HelperRequest", HelperRequestSchema);
