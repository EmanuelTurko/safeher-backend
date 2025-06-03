import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  profilePicture?: string;
  birthDate?: string;
  phoneNumber: string;
  idPhotoUrl?: string;
  accessToken?: string;
  safeCircleContacts: { name: string; phoneNumber: string }[];
  authProvider?: string;
  city?: string;
  comparePassword(password: string): Promise<boolean>;
}

const ContactSchema = new Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true }
  },
  { _id: false }
);

const UserSchema: Schema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: {
      type: String,
      required: function (this: any): boolean {
        return this.authProvider !== "google";
      },
      select: false
    },
    profilePicture: { type: String, default: "/avatar.webp" },
    birthDate: { type: String },
    phoneNumber: { type: String, required: true },
    city: { type: String, default: null },
    idPhotoUrl: { type: String },
    accessToken: { type: String },
    safeCircleContacts: {
      type: [ContactSchema],
      default: []
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    }
  },
  { timestamps: true }
);

// Method to compare passwords
UserSchema.methods.comparePassword = function (plainPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
