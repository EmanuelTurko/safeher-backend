import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createCall, disconnectCall, getActiveCalls, getCallHistory } from "../controllers/call.controller";

const callRouter = express.Router();

// יצירת שיחה חדשה
callRouter.post("/", authMiddleware, (req, res) => createCall(req as AuthenticatedRequest, res));

// ניתוק שיחה
callRouter.post("/:callId/disconnect", authMiddleware, (req, res) => disconnectCall(req as AuthenticatedRequest, res));

// קבלת שיחות פעילות
callRouter.get("/active", authMiddleware, (req, res) => getActiveCalls(req as AuthenticatedRequest, res));

// קבלת היסטוריית שיחות
callRouter.get("/history", authMiddleware, (req, res) => getCallHistory(req as AuthenticatedRequest, res));

export default callRouter;
