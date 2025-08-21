# Firebase Setup Guide

## 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable Cloud Messaging (FCM) in the project settings

## 2. Service Account Key

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Save it as `firebase-service-account-key.json` in the project root

## 3. Environment Variables

Add these to your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## 4. Alternative: Environment Variable Only

If you prefer to use environment variable only (recommended for production):

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

## 5. Android App Configuration

1. Add your Android app to Firebase project
2. Download `google-services.json`
3. Place it in your Android app's `app/` directory
4. Follow Firebase Android setup guide

## 6. iOS App Configuration (if needed)

1. Add your iOS app to Firebase project
2. Download `GoogleService-Info.plist`
3. Add it to your iOS project
4. Follow Firebase iOS setup guide

## 7. Testing

Use the test endpoints in `test-chat-notifications.rest` to verify the setup.

## 8. Security Notes

- Never commit `firebase-service-account-key.json` to version control
- Use environment variables in production
- Keep your service account key secure
