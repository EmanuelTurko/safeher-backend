import mongoose, { Schema, Document } from "mongoose";

export interface IHelperResponse extends Document {
  helperId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  requestId: mongoose.Types.ObjectId;
  accepted: boolean;
  createdAt: Date;
}

const HelperResponseSchema: Schema = new Schema<IHelperResponse>({
  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HelperRequest",
    required: true,
  },
  accepted: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IHelperResponse>("HelperResponse", HelperResponseSchema);
