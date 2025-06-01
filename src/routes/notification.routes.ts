import express from "express";
import { getUserNotifications, hasUnreadNotifications, markAllNotificationsAsRead} from "../controllers/notification.controller";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";

export const notificationRouter = express.Router();

notificationRouter.get("/my-notifications", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`GET notifications for userId: ${authRequest.user.id}`);
  getUserNotifications(authRequest, res);
});

notificationRouter.get("/has-unread", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`GET has-unread for userId: ${authRequest.user.id}`);
  hasUnreadNotifications(authRequest, res);
});

notificationRouter.post("/mark-all-read", authMiddleware, (req, res) => {
  const authRequest = req as AuthenticatedRequest;
  console.log(`POST mark-all-read for userId: ${authRequest.user.id}`);
  markAllNotificationsAsRead(authRequest, res);
});
