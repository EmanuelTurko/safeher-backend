import { Request, Response } from "express";
import Call from "../models/Call.model";
import User from "../models/User.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { PushNotificationService } from "../services/pushNotification.service";

// יצירת שיחה חדשה
export const createCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requesterId, helperId, callId, requestId } = req.body;
    const currentUserId = req.user.id;
    const idempotencyKey: string | undefined = req.header("Idempotency-Key") || (requestId && `${requestId}:${helperId}`);

    console.log("=== CREATE CALL DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Current user ID:", currentUserId);

    // וידוא שהמשתמש הנוכחי הוא מבקש העזרה או המתנדבת
    if (currentUserId !== requesterId && currentUserId !== helperId) {
      console.log("❌ Unauthorized: User not part of the call");
      res.status(403).json({ message: "forbidden", data: null, error: "forbidden" });
      return;
    }

    // בדיקה שהמשתמשים קיימים
    const [requester, helper] = await Promise.all([User.findById(requesterId), User.findById(helperId)]);

    if (!requester || !helper) {
      console.log("❌ User not found:", { requester: !!requester, helper: !!helper });
      res.status(404).json({ message: "not_found", data: null, error: "user_not_found" });
      return;
    }

    // first-accept wins: אם כבר קיימת שיחה לבקשה הזו
    if (requestId) {
      const existingForRequest = await Call.findOne({ requestId, status: "active" });
      if (existingForRequest) {
        console.log("❌ Call already exists for request:", existingForRequest._id);
        res.status(409).json({ message: "conflict", data: null, error: "already_accepted" });
        return;
      }
    }

    // Idempotency: אם יש מפתח אידמפוטנציה, להחזיר את אותה תוצאה
    if (idempotencyKey) {
      const existingByKey = await Call.findOne({ idempotencyKey });
      if (existingByKey) {
        res.status(200).json({
          message: "ok",
          data: { callId: existingByKey._id, status: existingByKey.status, startedAt: existingByKey.startedAt },
          error: null,
        });
        return;
      }
    }

    // בדיקה אם יש כבר שיחה פעילה בין שני המשתמשים (בטיחות)
    const existingCall = await Call.findOne({
      $or: [
        { requesterId, helperId, status: "active" },
        { requesterId: helperId, helperId: requesterId, status: "active" },
      ],
    });

    if (existingCall) {
      console.log("❌ Active call already exists:", existingCall._id);
      res.status(409).json({ message: "conflict", data: null, error: "already_accepted" });
      return;
    }

    // יצירת השיחה
    const call = new Call({
      requesterId,
      helperId,
      requestId,
      idempotencyKey,
      status: "active",
      callId,
      startedAt: new Date(),
    });

    await call.save();
    console.log("✅ Call created successfully:", call._id);

    // שליחת התראות התחלת שיחה לשני הצדדים (ללא תלות בפולינג)
    try {
      const requesterName = (requester as any).fullName || "מבקשת";
      const helperName = (helper as any).fullName || "מתנדבת";
      await Promise.all([PushNotificationService.sendCallStartedNotification((requesterId as any).toString(), (call._id as any).toString(), (requesterId as any).toString(), (helperId as any).toString(), requesterName, helperName), PushNotificationService.sendCallStartedNotification((helperId as any).toString(), (call._id as any).toString(), (requesterId as any).toString(), (helperId as any).toString(), requesterName, helperName)]);
    } catch (e) {
      console.warn("⚠️ Failed to send call started notifications", e);
    }

    res.status(200).json({ message: "ok", data: { callId: call._id, status: call.status, startedAt: call.startedAt }, error: null });
  } catch (error) {
    console.error("❌ Error creating call:", error);
    res.status(500).json({ message: "error", data: null, error: error instanceof Error ? error.message : "unknown_error" });
  }
};

// ניתוק שיחה
export const disconnectCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const currentUserId = req.user.id;

    console.log("=== DISCONNECT CALL DEBUG ===");
    console.log("Call ID:", callId);
    console.log("Current user ID:", currentUserId);

    // מציאת השיחה
    const call = await Call.findById(callId);
    if (!call) {
      console.log("❌ Call not found:", callId);
      res.status(404).json({
        success: false,
        message: "שיחה לא נמצאה",
      });
      return;
    }

    // וידוא שהמשתמש הנוכחי הוא חלק מהשיחה
    if (call.requesterId.toString() !== currentUserId && call.helperId.toString() !== currentUserId) {
      console.log("❌ Unauthorized: User not part of the call");
      res.status(403).json({
        success: false,
        message: "לא מורשה לנתק שיחה זו",
      });
      return;
    }

    // בדיקה שהשיחה עדיין פעילה
    if (call.status !== "active") {
      console.log("❌ Call is not active:", call.status);
      res.status(400).json({
        success: false,
        message: "השיחה כבר לא פעילה",
      });
      return;
    }

    // חישוב משך השיחה
    const duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000);

    // עדכון השיחה
    call.status = "disconnected";
    call.endedAt = new Date();
    call.endedBy = currentUserId as any;
    call.duration = duration;

    await call.save();
    console.log("✅ Call disconnected successfully");

    // שליחת התראות לשתי הצדדים
    const notificationPromises = [];

    // קבלת שם המשתמש שניתק
    const currentUser = await User.findById(currentUserId);
    const currentUserName = currentUser?.fullName || "משתמש";

    // התראה למבקש העזרה
    if (call.requesterId.toString() !== currentUserId) {
      notificationPromises.push(PushNotificationService.sendCallDisconnectedNotification(call.requesterId.toString(), (call._id as any).toString(), currentUserName, duration));
    }

    // התראה למתנדבת
    if (call.helperId.toString() !== currentUserId) {
      notificationPromises.push(PushNotificationService.sendCallDisconnectedNotification(call.helperId.toString(), (call._id as any).toString(), currentUserName, duration));
    }

    // שליחת ההתראות
    await Promise.all(notificationPromises);
    console.log("✅ Notifications sent to both parties");

    res.json({
      message: "ok",
      data: {
        callId: call._id,
        status: call.status,
        endedAt: call.endedAt,
        endedBy: call.endedBy,
        duration: call.duration,
      },
      error: null,
    });
  } catch (error) {
    console.error("❌ Error disconnecting call:", error);
    res.status(500).json({ message: "error", data: null, error: error instanceof Error ? error.message : "unknown_error" });
  }
};

// קבלת שיחות פעילות של משתמש
export const getActiveCalls = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;

    console.log("=== GET ACTIVE CALLS DEBUG ===");
    console.log("User ID:", currentUserId);

    const activeCalls = await Call.find({
      $or: [
        { requesterId: currentUserId, status: "active" },
        { helperId: currentUserId, status: "active" },
      ],
    })
      .populate("requesterId", "fullName")
      .populate("helperId", "fullName");

    console.log("Found active calls:", activeCalls.length);

    // המרת ObjectIds למחרוזות
    const callsForClient = activeCalls.map(call => ({
      ...call.toObject(),
      _id: (call._id as any).toString(),
      requesterId: (call.requesterId as any).toString(),
      helperId: (call.helperId as any).toString(),
      endedBy: call.endedBy ? (call.endedBy as any).toString() : null,
    }));

    res.json({ message: "ok", data: callsForClient, error: null });
  } catch (error) {
    console.error("❌ Error getting active calls:", error);
    res.status(500).json({ message: "error", data: null, error: error instanceof Error ? error.message : "unknown_error" });
  }
};

// קבלת היסטוריית שיחות של משתמש
export const getCallHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    console.log("=== GET CALL HISTORY DEBUG ===");
    console.log("User ID:", currentUserId);
    console.log("Limit:", limit, "Offset:", offset);

    const calls = await Call.find({
      $or: [{ requesterId: currentUserId }, { helperId: currentUserId }],
      status: { $in: ["ended", "disconnected"] },
    })
      .populate("requesterId", "fullName")
      .populate("helperId", "fullName")
      .populate("endedBy", "fullName")
      .sort({ endedAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    console.log("Found calls:", calls.length);

    // המרת ObjectIds למחרוזות
    const callsForClient = calls.map(call => ({
      ...call.toObject(),
      _id: (call._id as any).toString(),
      requesterId: (call.requesterId as any).toString(),
      helperId: (call.helperId as any).toString(),
      endedBy: call.endedBy ? (call.endedBy as any).toString() : null,
    }));

    res.json({ message: "ok", data: callsForClient, error: null });
  } catch (error) {
    console.error("❌ Error getting call history:", error);
    res.status(500).json({ message: "error", data: null, error: error instanceof Error ? error.message : "unknown_error" });
  }
};

// עדכון סטטוס שיחה (לשימוש חיצוני)
export const updateCallStatus = async (callId: string, status: "active" | "ended" | "disconnected", endedBy?: string): Promise<void> => {
  try {
    const call = await Call.findById(callId);
    if (!call) {
      throw new Error("Call not found");
    }

    call.status = status;
    if (status !== "active") {
      call.endedAt = new Date();
      if (endedBy) {
        call.endedBy = endedBy as any;
      }
      call.duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000);
    }

    await call.save();
    console.log(`✅ Call ${callId} status updated to ${status}`);
  } catch (error) {
    console.error("❌ Error updating call status:", error);
    throw error;
  }
};
