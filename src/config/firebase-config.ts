import * as admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let messaging: any = null;

// Build a service account from separate env vars if provided
const buildServiceAccountFromEnv = (): admin.ServiceAccount | null => {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

  if (clientEmail && projectId && privateKey) {
    return {
      clientEmail,
      projectId,
      privateKey,
    } as admin.ServiceAccount;
  }

  return null;
};

// Initialize Firebase Admin SDK only if service account is available
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : buildServiceAccountFromEnv() || require("../../firebase-service-account-key.json");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  messaging = admin.messaging();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.warn("Firebase not initialized - push notifications will be disabled");
  console.warn("To enable push notifications, set up Firebase service account key via env or local file");

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
