import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

const MessageSchema: Schema = new Schema<IMessage>({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

// Index for efficient querying of conversations
MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
