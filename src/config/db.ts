import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.model";
dotenv.config();

// Database connection
const connectDB = async () => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error("MONGO_URI is not defined in environment variables");
      }
      const conn = await mongoose.connect(mongoUri);

      // Run migration to add isHelper field to existing documents
      await migrateIsHelperField();

      resolve();

      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error("Unknown error");
      }
      reject(error);
      process.exit(1);
    }
  });
};

// Migration function to add isHelper field to existing users
const migrateIsHelperField = async () => {
  try {
    const result = await User.updateMany({ isHelper: { $exists: false } }, { $set: { isHelper: true } });

    if (result.modifiedCount > 0) {
      console.log(`Migration: Added isHelper field to ${result.modifiedCount} users`);
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
};

export default connectDB;
