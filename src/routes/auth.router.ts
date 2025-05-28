import express from "express";
import dotenv from "dotenv";
import { login, loginWithGoogle, register } from "../controllers/auth.controller";
import { getUserProfile ,updateUserSafeCircle} from "../controllers/user.controller";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { Request, Response } from "express";

dotenv.config();

export const authRouter = express.Router();

authRouter.post("/register", register);

authRouter.post("/login", login);

authRouter.post("/login-with-google", loginWithGoogle);

authRouter.post("/updateUserSafeCircle",authMiddleware ,updateUserSafeCircle);

authRouter.get("/check", authMiddleware, (req, res) => getUserProfile(req as AuthenticatedRequest, res));

authRouter.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  res.status(200).json({ message: "Password reset link sent successfully" });
});