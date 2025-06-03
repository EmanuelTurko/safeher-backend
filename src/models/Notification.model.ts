import mongoose, { Document, Schema } from "mongoose";

export interface FromUser {
  id: string;
  fullName: string;
  profilePicture?: string;
}

export interface Notification extends Document {
  userId: string; // למי שייכת ההתראה
  fromUser: FromUser; // מי עשה את הפעולה
  type: "like" | "comment"; // סוג הפעולה
  postId: string; // על איזה פוסט ההתראה
  createdAt: Date;
  read: boolean;
}

const NotificationSchema = new Schema<Notification>({
  userId: { type: String, required: true }, // בעל הפוסט
  fromUser: {
    id: { type: String, required: true },
    fullName: { type: String, required: true },
    profilePicture: { type: String }
  },
  type: {
    type: String,
    enum: ["like", "comment"],
    required: true
  },
  postId: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model<Notification>("Notification", NotificationSchema);
