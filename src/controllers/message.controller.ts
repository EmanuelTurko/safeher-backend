import { Request, Response } from "express";
import Message from "../models/Message.model";
import User from "../models/User.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { PushNotificationService } from "../services/pushNotification.service";

// Send a new message
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!receiverId || !content || content.trim().length === 0) {
      res.status(400).json({ error: "Receiver ID and content are required" });
      return;
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      res.status(404).json({ error: "Receiver not found" });
      return;
    }

    // Get sender info
    const sender = await User.findById(senderId);
    if (!sender) {
      res.status(404).json({ error: "Sender not found" });
      return;
    }

    // Create and save message
    const message = new Message({
      senderId,
      senderName: sender.fullName,
      receiverId,
      content: content.trim(),
    });

    await message.save();

    // Send push notification to receiver
    await PushNotificationService.sendMessageNotification(receiverId, sender.fullName, content.trim());

    res.status(201).json({
      message: "Message sent successfully",
      messageId: message._id,
      timestamp: message.timestamp,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get conversation between two users
export const getConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId1, userId2 } = req.params;
    const currentUserId = req.user.id;

    // Validate that current user is part of the conversation
    if (currentUserId !== userId1 && currentUserId !== userId2) {
      res.status(403).json({ error: "Not authorized to access this conversation" });
      return;
    }

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    })
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages

    res.json(messages);
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Mark message as read
export const markMessageAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Check if current user is the receiver
    if (message.receiverId.toString() !== currentUserId) {
      res.status(403).json({ error: "Not authorized to mark this message as read" });
      return;
    }

    message.isRead = true;
    await message.save();

    res.json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Mark all messages from a user as read
export const markAllMessagesAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { senderId } = req.params;
    const currentUserId = req.user.id;

    const result = await Message.updateMany(
      {
        senderId,
        receiverId: currentUserId,
        isRead: false,
      },
      { isRead: true }
    );

    res.json({
      message: "Messages marked as read",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get unread message count for current user
export const getUnreadMessageCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;

    const count = await Message.countDocuments({
      receiverId: currentUserId,
      isRead: false,
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Error getting unread message count:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get recent conversations for current user
export const getRecentConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;

    // Get the most recent message from each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ["$senderId", currentUserId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$receiverId", currentUserId] }, { $eq: ["$isRead", false] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "lastMessage.timestamp": -1 },
      },
      {
        $limit: 20,
      },
    ]);

    // Populate user information for each conversation
    const conversationsWithUserInfo = await Message.populate(conversations, [
      {
        path: "lastMessage.senderId",
        select: "fullName profilePicture",
        model: "User",
      },
      {
        path: "lastMessage.receiverId",
        select: "fullName profilePicture",
        model: "User",
      },
    ]);

    res.json(conversationsWithUserInfo);
  } catch (error) {
    console.error("Error getting recent conversations:", error);
    res.status(500).json({ error: "Server error" });
  }
};
