import { messaging } from "../config/firebase-config";
import User from "../models/User.model";
import { Message, MulticastMessage } from "firebase-admin/messaging";

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  static async sendToUser(userId: string, notification: PushNotificationData): Promise<boolean> {
    try {
      console.log(`=== SENDING PUSH NOTIFICATION TO USER ${userId} ===`);
      console.log("Notification data:", notification);

      const user = await User.findById(userId);
      if (!user) {
        console.log(`❌ User ${userId} not found`);
        return false;
      }

      if (!user.fcmToken) {
        console.log(`❌ User ${userId} has no FCM token`);
        return false;
      }

      console.log(`✅ User ${userId} found:`, user.fullName);
      console.log(`FCM Token:`, user.fcmToken.substring(0, 20) + "...");

      const message: Message = {
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: "high" as const,
          notification: {
            channelId: "safeher_channel",
            priority: "high" as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      console.log("FCM Message prepared:", {
        token: message.token.substring(0, 20) + "...",
        notification: message.notification,
        data: message.data,
      });

      const response = await messaging.send(message);
      console.log(`✅ Push notification sent to user ${userId}:`, response);
      return true;
    } catch (error) {
      console.error(`❌ Error sending push notification to user ${userId}:`, error);

      // Log specific Firebase errors
      if (error && typeof error === "object" && "code" in error) {
        console.error("Firebase error code:", (error as any).code);
        console.error("Firebase error message:", (error as any).message);
      }

      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToMultipleUsers(userIds: string[], notification: PushNotificationData): Promise<number> {
    try {
      const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } });
      const tokens = users.map(user => user.fcmToken!);

      if (tokens.length === 0) {
        console.log("No FCM tokens found for the specified users");
        return 0;
      }

      const message: MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: "high" as const,
          notification: {
            channelId: "safeher_channel",
            priority: "high" as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`Push notifications sent to ${response.successCount}/${tokens.length} users`);
      return response.successCount;
    } catch (error) {
      console.error("Error sending push notifications to multiple users:", error);
      return 0;
    }
  }

  /**
   * Send helper request notification to all available helpers
   */
  static async sendHelperRequestNotifications(requesterName: string, requestId: string, helperIds: string[]): Promise<number> {
    const notification: PushNotificationData = {
      title: "בקשת עזרה חדשה",
      body: `${requesterName} מבקשת עזרה דחופה`,
      data: {
        type: "helper_request",
        requestId: requestId,
        requesterName: requesterName,
      },
    };

    return await this.sendToMultipleUsers(helperIds, notification);
  }

  /**
   * Send helper response notification to requester
   */
  static async sendHelperResponseNotification(requesterId: string, helperName: string, accepted: boolean): Promise<boolean> {
    const notification: PushNotificationData = {
      title: "תגובה לבקשת עזרה",
      body: accepted ? `${helperName} קיבלה את בקשת העזרה שלך` : `${helperName} לא יכולה לעזור כרגע`,
      data: {
        type: "helper_response",
        accepted: accepted.toString(),
        helperName: helperName,
      },
    };

    return await this.sendToUser(requesterId, notification);
  }

  /**
   * Send new message notification
   */
  static async sendMessageNotification(receiverId: string, senderName: string, messagePreview: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: `הודעה חדשה מ-${senderName}`,
      body: messagePreview.length > 50 ? messagePreview.substring(0, 50) + "..." : messagePreview,
      data: {
        type: "new_message",
        senderName: senderName,
      },
    };

    return await this.sendToUser(receiverId, notification);
  }

  /**
   * Check Firebase status and helper availability
   */
  static async checkFirebaseStatus(): Promise<{
    firebaseInitialized: boolean;
    totalHelpers: number;
    helpersWithFcmToken: number;
    sampleFcmTokens: string[];
  }> {
    try {
      console.log("=== FIREBASE STATUS CHECK ===");

      // Check if Firebase is initialized
      const firebaseInitialized = messaging !== null;
      console.log("Firebase initialized:", firebaseInitialized);

      // Count helpers
      const allHelpers = await User.find({ isHelper: true });
      const helpersWithFcmToken = await User.find({
        isHelper: true,
        fcmToken: { $exists: true, $ne: null },
      });

      console.log("Total helpers:", allHelpers.length);
      console.log("Helpers with FCM token:", helpersWithFcmToken.length);

      // Get sample FCM tokens (first 3)
      const sampleFcmTokens = helpersWithFcmToken.slice(0, 3).map(h => h.fcmToken!.substring(0, 20) + "...");

      console.log("Sample FCM tokens:", sampleFcmTokens);

      return {
        firebaseInitialized,
        totalHelpers: allHelpers.length,
        helpersWithFcmToken: helpersWithFcmToken.length,
        sampleFcmTokens,
      };
    } catch (error) {
      console.error("Error checking Firebase status:", error);
      return {
        firebaseInitialized: false,
        totalHelpers: 0,
        helpersWithFcmToken: 0,
        sampleFcmTokens: [],
      };
    }
  }
}
