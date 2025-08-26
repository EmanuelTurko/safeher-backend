import { Request, Response } from "express";
import HelperRequest from "../models/HelperRequest.model";
import HelperResponse from "../models/HelperResponse.model";
import User from "../models/User.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { PushNotificationService } from "../services/pushNotification.service";

// Create a helper request
export const createHelperRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requesterId, requesterName, helperIds } = req.body;

    console.log("=== HELPER REQUEST DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Requester ID:", requesterId);
    console.log("Requester Name:", requesterName);
    console.log("Helper IDs:", helperIds);

    // Verify requester exists
    const requester = await User.findById(requesterId);
    if (!requester) {
      console.log("❌ Requester not found:", requesterId);
      res.status(404).json({
        success: false,
        message: "Requester not found",
      });
      return;
    }
    console.log("✅ Requester found:", requester.fullName);

    // Verify helpers exist and have a valid FCM token
    const helpers = await User.find({
      _id: { $in: helperIds },
      isHelper: true,
      fcmToken: { $exists: true, $ne: null },
    })
      .where("fcmToken")
      .ne("")
      .where("fcmToken")
      .ne("null");

    console.log("Total helpers requested:", helperIds.length);
    console.log("Helpers found with isHelper=true and FCM token:", helpers.length);
    console.log(
      "Helper IDs found:",
      helpers.map(h => h._id)
    );
    console.log(
      "Helper FCM tokens:",
      helpers.map(h => ({ id: h._id, fcmToken: h.fcmToken?.substring(0, 20) + "..." }))
    );

    if (helpers.length === 0) {
      console.log("❌ No available helpers with FCM token found");
      res.status(404).json({
        success: false,
        message: "No available helpers with FCM token found",
      });
      return;
    }

    // Create the helper request
    const helperRequest = new HelperRequest({
      requesterId,
      requesterName,
      helperIds: helpers.map(h => h._id),
      status: "pending",
      createdAt: new Date(),
    });

    await helperRequest.save();
    console.log("✅ HelperRequest saved to database");
    console.log("✅ Request ID:", helperRequest._id);
    console.log("✅ Requester ID:", helperRequest.requesterId);
    console.log("✅ Requester Name:", helperRequest.requesterName);
    console.log("✅ Status:", helperRequest.status);
    console.log("✅ Helper IDs:", helperRequest.helperIds);
    console.log("✅ Created At:", helperRequest.createdAt);
    console.log("✅ Expires At:", helperRequest.expiresAt);

    // Send push notifications to helpers
    console.log("=== SENDING PUSH NOTIFICATIONS ===");
    let notificationsSent = 0;
    let notificationsFailed = 0;

    // Additional check - only helpers with a valid FCM token
    const helpersWithFcmToken = helpers.filter(helper => helper.fcmToken && helper.fcmToken.trim() !== "" && helper.fcmToken !== "null");
    console.log(`Found ${helpersWithFcmToken.length} helpers with valid FCM tokens out of ${helpers.length} total helpers`);

    const notificationPromises = helpersWithFcmToken.map(async helper => {
      const helperId = (helper._id as any).toString();
      try {
        console.log(`Processing helper ${helperId}:`, helper.fullName);

        if (helper.fcmToken) {
          console.log(`Helper ${helperId} has FCM token:`, helper.fcmToken.substring(0, 20) + "...");

          const notificationData = {
            title: "Helper Request",
            body: `${requesterName} is looking for a companion call, are you available to help?`,
            data: {
              type: "helper_request",
              requestId: (helperRequest._id as any).toString(),
              requesterId: requesterId,
              requesterName: requesterName,
            },
          };

          console.log(`Sending FCM to helper ${helperId}:`, notificationData);

          const success = await PushNotificationService.sendToUser(helperId, notificationData);

          if (success) {
            console.log(`✅ FCM sent successfully to helper ${helperId}`);
            notificationsSent++;
          } else {
            console.log(`❌ FCM failed for helper ${helperId}`);
            notificationsFailed++;
          }
        } else {
          console.log(`❌ Helper ${helperId} has no FCM token`);
          notificationsFailed++;
        }
      } catch (error) {
        console.error(`❌ Error sending notification to helper ${helperId}:`, error);
        notificationsFailed++;
      }
    });

    await Promise.all(notificationPromises);

    console.log("=== PUSH NOTIFICATION SUMMARY ===");
    console.log(`Total helpers requested: ${helperIds.length}`);
    console.log(`Helpers with FCM token: ${helpersWithFcmToken.length}`);
    console.log(`Total notifications sent: ${notificationsSent}`);
    console.log(`Total notifications failed: ${notificationsFailed}`);
    console.log(`Helpers count for response: ${notificationsSent}`);

    res.json({
      success: true,
      message: "Helper request created successfully",
      data: {
        requestId: (helperRequest._id as any).toString(),
        helpersCount: notificationsSent,
        notificationsSent,
        notificationsFailed,
        totalHelpersRequested: helperIds.length,
        helpersWithFcmToken: helpersWithFcmToken.length,
      },
    });
  } catch (error) {
    console.error("❌ Error creating helper request:", error);
    res.status(500).json({
      success: false,
      message: "Error creating helper request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Respond to a helper request
export const respondToHelperRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log("=== HELPER RESPONSE DEBUG ===");
    console.log("Request body:", req.body);

    // Support both formats
    let requestId = req.body.requestId;
    let helperId = req.body.helperId;
    let response = req.body.response;
    let requesterId = req.body.requesterId;
    let accepted = req.body.accepted;

    console.log("Parsed values:");
    console.log("- requestId:", requestId);
    console.log("- helperId:", helperId);
    console.log("- response:", response);
    console.log("- requesterId:", requesterId);
    console.log("- accepted:", accepted);
    console.log("- response type:", typeof response);
    console.log("- response === 'accepted':", response === "accepted");
    console.log("- response === 'accept':", response === "accept");

    // If 'accepted' exists but 'response' missing - convert
    if (accepted !== undefined && response === undefined) {
      response = accepted ? "accepted" : "declined";
      console.log("Converted accepted to response:", response);
    }

    // If 'requesterId' exists but 'requestId' missing - try to find the request
    if (!requestId && requesterId && helperId) {
      console.log("Looking for request by requesterId and helperId...");
      const helperRequest = await HelperRequest.findOne({
        requesterId: requesterId,
        helperIds: helperId,
        status: "pending",
      });

      if (helperRequest) {
        requestId = (helperRequest._id as any).toString();
        console.log("Found request by requesterId:", requestId);
      }
    }

    if (!requestId) {
      console.log("❌ No requestId found");
      res.status(400).json({
        success: false,
        message: "requestId is required",
      });
      return;
    }

    if (!helperId) {
      console.log("❌ No helperId found");
      res.status(400).json({
        success: false,
        message: "helperId is required",
      });
      return;
    }

    if (!response) {
      console.log("❌ No response found");
      res.status(400).json({
        success: false,
        message: "response is required",
      });
      return;
    }

    console.log("Looking for helper request with ID:", requestId);

    // Verify request exists
    const helperRequest = await HelperRequest.findById(requestId);
    if (!helperRequest) {
      console.log("❌ Helper request not found:", requestId);
      res.status(404).json({
        success: false,
        message: "Helper request not found",
      });
      return;
    }

    console.log("✅ Helper request found:", helperRequest._id);
    console.log("Current status:", helperRequest.status);
    console.log("Requester ID:", helperRequest.requesterId);
    console.log("Requester Name:", helperRequest.requesterName);
    console.log("Helper IDs in request:", helperRequest.helperIds);
    console.log("Current acceptedBy:", helperRequest.acceptedBy);

    // Ensure the helper is part of the request's helperIds
    if (!helperRequest.helperIds.includes(helperId)) {
      console.log("❌ Helper not in request list:", helperId);
      res.status(403).json({
        success: false,
        message: "Not authorized to respond to this request",
      });
      return;
    }

    // Ensure the request is still pending
    if (helperRequest.status !== "pending") {
      console.log("❌ Request is no longer active:", helperRequest.status);
      res.status(400).json({
        success: false,
        message: "Request is no longer active",
      });
      return;
    }

    console.log("✅ All validations passed, processing response...");

    // Create the response document
    const helperResponse = new HelperResponse({
      helperId,
      requesterId: helperRequest.requesterId,
      requestId,
      accepted: response === "accepted",
    });

    await helperResponse.save();
    console.log("✅ HelperResponse saved");

    // Append the response into the request's responses array
    helperRequest.responses = helperRequest.responses || [];
    helperRequest.responses.push({
      helperId,
      response,
      respondedAt: new Date(),
    });

    if (response === "accepted" || response === "accept") {
      // Update the request status
      helperRequest.status = "accepted";
      helperRequest.acceptedBy = helperId;
      console.log("✅ Request accepted by helper:", helperId);
      console.log("✅ Updated acceptedBy field:", helperRequest.acceptedBy);
      console.log("✅ Status changed from 'pending' to 'accepted'");
      console.log("✅ Response was:", response);

      // No FCM notification to requester - they will get update via polling
      console.log("ℹ️ No FCM notification sent to requester - they will get update via polling");
      console.log("ℹ️ Flow: Helper accepts → DB updated → Requester polls for status → UI updates");
    }

    console.log("=== BEFORE SAVE ===");
    console.log("Status before save:", helperRequest.status);
    console.log("AcceptedBy before save:", helperRequest.acceptedBy);

    await helperRequest.save();

    console.log("=== AFTER SAVE ===");
    console.log("✅ HelperRequest saved to database");
    console.log("✅ Final status:", helperRequest.status);
    console.log("✅ Final acceptedBy:", helperRequest.acceptedBy);
    console.log("✅ Final request ID:", helperRequest._id);

    // Extra verification - read from DB
    const savedRequest = await HelperRequest.findById(requestId);
    console.log("=== DATABASE VERIFICATION ===");
    console.log("Status from DB:", savedRequest?.status);
    console.log("AcceptedBy from DB:", savedRequest?.acceptedBy);

    // No FCM notification to requester - they will get update via polling
    console.log("ℹ️ No FCM notification sent to requester - they will get update via polling");

    console.log("✅ Helper response processed successfully");

    // Flow summary
    console.log("=== FLOW SUMMARY ===");
    console.log("1. Helper accepted request");
    console.log("2. Status updated to 'accepted' in DB");
    console.log("3. acceptedBy field set to helper ID");
    console.log("4. NO FCM notification sent to requester");
    console.log("5. Requester will get update via polling");
    console.log("6. This maintains the original flow correctly");

    // Prepare the response payload with all required fields
    const responseData = {
      success: true,
      message: "Response recorded successfully",
      data: {
        requestId: (helperRequest._id as any).toString(),
        status: helperRequest.status,
        accepted: response === "accepted" || response === "accept",
        acceptedBy: helperRequest.acceptedBy ? (helperRequest.acceptedBy as any).toString() : null,
        requesterId: (helperRequest.requesterId as any).toString(),
        requesterName: helperRequest.requesterName,
        helperId: helperId,
        response: response,
        originalResponse: response,
        isAccepted: response === "accepted" || response === "accept",
      },
    };

    console.log("=== RESPONSE DATA ===");
    console.log("Response data:", JSON.stringify(responseData, null, 2));
    console.log("=== SUMMARY ===");
    console.log("Request ID:", requestId);
    console.log("Helper ID:", helperId);
    console.log("Response:", response);
    console.log("Final Status:", helperRequest.status);
    console.log("Final AcceptedBy:", helperRequest.acceptedBy);
    console.log("Is Accepted:", response === "accepted" || response === "accept");

    res.json(responseData);
  } catch (error) {
    console.error("❌ Error responding to helper request:", error);
    res.status(500).json({
      success: false,
      message: "Error responding to helper request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get helper requests for a helper
export const getMyHelperRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const helperId = req.user.id;

    const requests = await HelperRequest.find({
      helperIds: helperId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("requesterId", "fullName");

    // Convert ObjectIds to strings for client compatibility
    const requestsForClient = requests.map(request => ({
      ...request.toObject(),
      _id: (request._id as any).toString(),
      requesterId: (request.requesterId as any).toString(),
      helperIds: (request.helperIds as any[]).map(id => id.toString()),
      acceptedBy: request.acceptedBy ? (request.acceptedBy as any).toString() : null,
      responses: request.responses
        ? request.responses.map(response => ({
            ...response,
            helperId: (response.helperId as any).toString(),
          }))
        : [],
    }));

    res.json({
      success: true,
      data: requestsForClient,
    });
  } catch (error) {
    console.error("Error getting helper requests:", error);
    res.status(500).json({
      success: false,
      message: "Error getting helper requests",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get helper requests created by the requester
export const getMyRequestsAsRequester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user.id;

    console.log("=== GET MY REQUESTS AS REQUESTER ===");
    console.log("User ID (requester):", requesterId);

    // Calculate the time five minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    console.log("Five minutes ago:", fiveMinutesAgo);
    console.log("Current time:", new Date());

    const requests = await HelperRequest.find({
      requesterId,
      status: { $in: ["pending", "accepted"] },
      createdAt: { $gte: fiveMinutesAgo },
    });

    console.log("Found requests:", requests.length);

    requests.forEach((request, index) => {
      const isRecent = request.createdAt >= fiveMinutesAgo;
      console.log(`Request ${index + 1}:`, {
        id: request._id,
        status: request.status,
        requesterId: request.requesterId,
        requesterName: request.requesterName,
        acceptedBy: request.acceptedBy,
        createdAt: request.createdAt,
        expiresAt: request.expiresAt,
        isRecent: isRecent,
        timeDiff: Math.floor((Date.now() - request.createdAt.getTime()) / 1000) + " seconds ago",
      });
    });

    // Inspection: accepted requests
    const acceptedRequests = requests.filter(req => req.status === "accepted");
    console.log("Accepted requests count:", acceptedRequests.length);

    acceptedRequests.forEach((request, index) => {
      console.log(`Accepted Request ${index + 1}:`, {
        id: request._id,
        acceptedBy: request.acceptedBy,
        requesterId: request.requesterId,
        status: request.status,
        createdAt: request.createdAt,
      });
    });

    // Inspection: pending requests
    const pendingRequests = requests.filter(req => req.status === "pending");
    console.log("Pending requests count:", pendingRequests.length);

    pendingRequests.forEach((request, index) => {
      console.log(`Pending Request ${index + 1}:`, {
        id: request._id,
        acceptedBy: request.acceptedBy,
        requesterId: request.requesterId,
        status: request.status,
        createdAt: request.createdAt,
      });
    });

    // Convert ObjectIds to strings for client compatibility
    const requestsForClient = requests.map(request => ({
      ...request.toObject(),
      _id: (request._id as any).toString(),
      requesterId: (request.requesterId as any).toString(),
      helperIds: (request.helperIds as any[]).map(id => id.toString()),
      acceptedBy: request.acceptedBy ? (request.acceptedBy as any).toString() : null,
      responses: request.responses
        ? request.responses.map(response => ({
            ...response,
            helperId: (response.helperId as any).toString(),
          }))
        : [],
    }));

    console.log("=== REQUESTS FOR CLIENT ===");
    requestsForClient.forEach((request, index) => {
      console.log(`Client Request ${index + 1}:`, {
        id: request._id,
        status: request.status,
        acceptedBy: request.acceptedBy,
        requesterId: request.requesterId,
        createdAt: request.createdAt,
      });
    });

    res.json({
      success: true,
      data: requestsForClient,
      message: "Requests retrieved successfully",
      count: requests.length,
      acceptedCount: acceptedRequests.length,
      debug: {
        totalRequests: requests.length,
        acceptedRequests: acceptedRequests.length,
        pendingRequests: pendingRequests.length,
        timeFilter: fiveMinutesAgo,
        currentTime: new Date(),
        message: acceptedRequests.length === 0 ? "No accepted requests found - check if status is being updated correctly" : `${acceptedRequests.length} accepted requests found`,
        requestDetails: requests.map(r => ({
          id: (r._id as any).toString(),
          status: r.status,
          acceptedBy: r.acceptedBy ? (r.acceptedBy as any).toString() : null,
          createdAt: r.createdAt,
          isRecent: r.createdAt >= fiveMinutesAgo,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting requester requests:", error);
    res.status(500).json({
      success: false,
      message: "Error getting requester requests",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Cleanup expired requests
export const cleanupExpiredRequests = async (): Promise<void> => {
  try {
    const result = await HelperRequest.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() },
      },
      { status: "expired" }
    );

    if (result.modifiedCount > 0) {
      console.log(`Cleaned up ${result.modifiedCount} expired requests`);
    }
  } catch (error) {
    console.error("Error cleaning expired requests:", error);
  }
};

// Check Firebase status
export const checkFirebaseStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await PushNotificationService.checkFirebaseStatus();

    // Fetch helpers that have valid FCM tokens
    const helpersWithFcmToken = await User.find({
      isHelper: true,
      fcmToken: { $exists: true, $ne: null },
    })
      .where("fcmToken")
      .ne("")
      .where("fcmToken")
      .ne("null");

    const totalHelpers = await User.countDocuments({ isHelper: true });

    const sampleFcmTokens = helpersWithFcmToken.slice(0, 3).map(helper => ({
      id: helper._id,
      name: helper.fullName,
      fcmToken: helper.fcmToken?.substring(0, 20) + "...",
      hasValidToken: helper.fcmToken && helper.fcmToken.trim() !== "" && helper.fcmToken !== "null",
    }));

    res.json({
      success: true,
      message: "Firebase status checked successfully",
      data: {
        ...status,
        totalHelpers,
        helpersWithFcmToken: helpersWithFcmToken.length,
        sampleFcmTokens: sampleFcmTokens.map(h => h.fcmToken),
        sampleHelpers: sampleFcmTokens.map(h => ({
          id: h.id,
          name: h.name,
          hasValidToken: h.hasValidToken,
        })),
        debugInfo: {
          totalHelpers,
          helpersWithFcmToken: helpersWithFcmToken.length,
          percentage: totalHelpers > 0 ? Math.round((helpersWithFcmToken.length / totalHelpers) * 100) : 0,
          message: helpersWithFcmToken.length === 0 ? "No helpers have FCM tokens - this is why notifications are not being sent" : `${helpersWithFcmToken.length} helpers have FCM tokens`,
        },
      },
    });
  } catch (error) {
    console.error("Error checking Firebase status:", error);
    res.status(500).json({
      success: false,
      message: "Error checking Firebase status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Database inspection - DEBUG ONLY
export const debugHelperRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log("=== DEBUG HELPER REQUESTS ===");

    const allRequests = await HelperRequest.find({}).sort({ createdAt: -1 }).limit(10);

    console.log("Total requests in DB:", allRequests.length);

    const debugData = allRequests.map(request => ({
      id: (request._id as any).toString(),
      status: request.status,
      requesterId: (request.requesterId as any).toString(),
      requesterName: request.requesterName,
      helperIds: (request.helperIds as any[]).map(id => id.toString()),
      acceptedBy: request.acceptedBy ? (request.acceptedBy as any).toString() : null,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    }));

    console.log("Debug data:", JSON.stringify(debugData, null, 2));

    res.json({
      success: true,
      data: debugData,
      message: "Debug data retrieved successfully",
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving debug data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
