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

      // Log specific Firebase errors and handle invalid tokens
      if (error && typeof error === "object" && "code" in error) {
        const code = (error as any).code as string;
        const message = (error as any).message as string;
        console.error("Firebase error code:", code);
        console.error("Firebase error message:", message);

        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          console.warn(`Removing invalid FCM token for user ${userId}`);
          await User.updateOne({ _id: userId }, { $unset: { fcmToken: "" } });
        }
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

      // Per-token diagnostics and cleanup of invalid tokens
      for (let i = 0; i < response.responses.length; i++) {
        const r = response.responses[i];
        const u = users[i];
        if (!r.success) {
          const code = (r.error as any)?.code as string | undefined;
          const msg = (r.error as any)?.message as string | undefined;
          console.error(`❌ Failed to send to user ${u?._id} (${u?.fullName || "unknown"}):`, code, msg);
          if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
            console.warn(`Removing invalid FCM token for user ${u?._id}`);
            if (u?._id) {
              await User.updateOne({ _id: u._id }, { $unset: { fcmToken: "" } });
            }
          }
        }
      }
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
      title: "New help request",
      body: `${requesterName} is requesting urgent assistance`,
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
      title: "Help request response",
      body: accepted ? `${helperName} accepted your help request` : `${helperName} cannot help right now`,
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
      title: `New message from ${senderName}`,
      body: messagePreview.length > 50 ? messagePreview.substring(0, 50) + "..." : messagePreview,
      data: {
        type: "new_message",
        senderName: senderName,
      },
    };

    return await this.sendToUser(receiverId, notification);
  }

  /**
   * Send call disconnected notification
   */
  static async sendCallDisconnectedNotification(userId: string, callId: string, endedByUserName: string, duration: number): Promise<boolean> {
    const notification: PushNotificationData = {
      title: "Call ended",
      body: `Call disconnected by ${endedByUserName} (duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`,
      data: {
        type: "call_disconnected",
        callId,
        endedBy: endedByUserName,
        duration: duration.toString(),
      },
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Send call started notification (optional)
   */
  static async sendCallStartedNotification(userId: string, callId: string, requesterId: string, helperId: string, requesterName?: string, helperName?: string): Promise<boolean> {
    const notification: PushNotificationData = {
      title: "Call started",
      body: "The call has started; the timer runs on the client",
      data: {
        type: "call_started",
        callId,
        requesterId,
        helperId,
        ...(requesterName ? { requesterName } : {}),
        ...(helperName ? { helperName } : {}),
      },
    };

    return await this.sendToUser(userId, notification);
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
