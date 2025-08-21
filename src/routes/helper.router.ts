import express from "express";
import { createHelperRequest, respondToHelperRequest, getMyHelperRequests, getMyRequestsAsRequester, checkFirebaseStatus, debugHelperRequests } from "../controllers/helper.controller";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";

export const helperRouter = express.Router();

// יצירת בקשה לעזרה
helperRouter.post("/request", authMiddleware, (req, res) => createHelperRequest(req as AuthenticatedRequest, res));

// תגובה לבקשת עזרה
helperRouter.post("/respond", authMiddleware, (req, res) => respondToHelperRequest(req as AuthenticatedRequest, res));

// קבלת בקשות עזרה למתנדבת
helperRouter.get("/my-requests", authMiddleware, (req, res) => getMyHelperRequests(req as AuthenticatedRequest, res));

// קבלת בקשות עזרה של משתמש
helperRouter.get("/my-requests-as-requester", authMiddleware, (req, res) => getMyRequestsAsRequester(req as AuthenticatedRequest, res));

// בדיקת מצב Firebase (debug)
helperRouter.get("/firebase-status", authMiddleware, (req, res) => checkFirebaseStatus(req as AuthenticatedRequest, res));

// בדיקת בסיס הנתונים (debug)
helperRouter.get("/debug", authMiddleware, (req, res) => debugHelperRequests(req as AuthenticatedRequest, res));
