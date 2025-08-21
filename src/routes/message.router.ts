import express from "express";
import { sendMessage, getConversation, markMessageAsRead, markAllMessagesAsRead, getUnreadMessageCount, getRecentConversations } from "../controllers/message.controller";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";

export const messageRouter = express.Router();

// Send a new message
messageRouter.post("/", authMiddleware, (req, res) => sendMessage(req as AuthenticatedRequest, res));

// Get conversation between two users
messageRouter.get("/conversation/:userId1/:userId2", authMiddleware, (req, res) => getConversation(req as AuthenticatedRequest, res));

// Mark message as read
messageRouter.put("/:messageId/read", authMiddleware, (req, res) => markMessageAsRead(req as AuthenticatedRequest, res));

// Mark all messages from a user as read
messageRouter.put("/read-all/:senderId", authMiddleware, (req, res) => markAllMessagesAsRead(req as AuthenticatedRequest, res));

// Get unread message count
messageRouter.get("/unread-count", authMiddleware, (req, res) => getUnreadMessageCount(req as AuthenticatedRequest, res));

// Get recent conversations
messageRouter.get("/conversations", authMiddleware, (req, res) => getRecentConversations(req as AuthenticatedRequest, res));
