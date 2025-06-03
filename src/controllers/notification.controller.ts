import { Request, Response } from "express";
import NotificationModel from "../models/Notification.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({ data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const hasUnreadNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hasUnread = await NotificationModel.exists({ userId: req.user.id, read: false });
    res.status(200).json({ data: !!hasUnread });
  } catch (error) {
    console.error("Error checking unread notifications:", error);
    res.status(500).json({ message: "Failed to check unread notifications" });
  }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await NotificationModel.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};
