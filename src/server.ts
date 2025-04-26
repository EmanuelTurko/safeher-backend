import express, { Express } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import authRoutes from "./routes/authRoutes";
dotenv.config();
import PostRoutes from "./routes/postRoutes";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/posts", PostRoutes);
app.use("/api/auth", authRoutes);

const appInit = async () => {
  return new Promise<Express>((resolve, reject) => {
    const db = mongoose.connection;
    db.on("error", err => {
      console.error("MongoDB connection error:", err);
      reject(err);
    });
    db.once("open", () => {
      console.log("MongoDB connected");
    });
    if (process.env.MONGO_URL === undefined) {
      console.error("Set up MONGO_URL in env file");
      reject(new Error("MONGO_URL not found"));
    } else {
      mongoose
        .connect(process.env.MONGO_URL)
        .then(() => {
          console.log("appInit finish");
          resolve(app);
        })
        .catch(err => {
          console.error("Failed to connect to MongoDB:", err);
          reject(err);
        });
    }
  });
};

export default appInit;
