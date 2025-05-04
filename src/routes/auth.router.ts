import express from "express";
import dotenv from "dotenv";
import { login, loginWithGoogle, register } from "../controllers/auth.controller";
import { getUserProfile ,updateUserSafeCircle} from "../controllers/user.controller";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";

dotenv.config();

export const authRouter = express.Router();

authRouter.post("/register", register);

authRouter.post("/login", login);

authRouter.post("/login-with-google", loginWithGoogle);

authRouter.post("/updateUserSafeCircle", updateUserSafeCircle);

authRouter.get("/check", authMiddleware, (req, res) => getUserProfile(req as AuthenticatedRequest, res));
