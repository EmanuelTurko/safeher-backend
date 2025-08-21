import * as admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let messaging: any = null;

// Initialize Firebase Admin SDK only if service account is available
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : require("../../firebase-service-account-key.json");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  messaging = admin.messaging();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.warn("Firebase not initialized - push notifications will be disabled");
  console.warn("To enable push notifications, set up Firebase service account key");

  // Create a mock messaging object
  messaging = {
    send: async () => {
      console.log("Mock: Push notification would be sent here");
      return "mock-message-id";
    },
    sendEachForMulticast: async () => {
      console.log("Mock: Multicast push notifications would be sent here");
      return { successCount: 0, failureCount: 0 };
    },
  };
}

export { messaging };
export default admin;
