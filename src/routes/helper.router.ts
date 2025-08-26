import express from "express";
import { createHelperRequest, respondToHelperRequest, getMyHelperRequests, getMyRequestsAsRequester, checkFirebaseStatus, debugHelperRequests } from "../controllers/helper.controller";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";

export const helperRouter = express.Router();

// Create a helper request
helperRouter.post("/request", authMiddleware, (req, res) => createHelperRequest(req as AuthenticatedRequest, res));

// Respond to a helper request
helperRouter.post("/respond", authMiddleware, (req, res) => respondToHelperRequest(req as AuthenticatedRequest, res));

// Get helper requests for a helper
helperRouter.get("/my-requests", authMiddleware, (req, res) => getMyHelperRequests(req as AuthenticatedRequest, res));

// Get helper requests created by the requester
helperRouter.get("/my-requests-as-requester", authMiddleware, (req, res) => getMyRequestsAsRequester(req as AuthenticatedRequest, res));

// Check Firebase status (debug)
helperRouter.get("/firebase-status", authMiddleware, (req, res) => checkFirebaseStatus(req as AuthenticatedRequest, res));

// Database inspection (debug)
helperRouter.get("/debug", authMiddleware, (req, res) => debugHelperRequests(req as AuthenticatedRequest, res));
