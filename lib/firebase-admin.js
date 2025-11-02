// /lib/firebase-admin.js
import admin from "firebase-admin";

// --- pilih salah satu cara baca kredensial ---

// Cara A: dari 3 env terpisah
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Cara B: dari base64 JSON utuh
let fromBase64 = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  fromBase64 = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString(
      "utf8"
    )
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: fromBase64
      ? admin.credential.cert(fromBase64)
      : admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export const fcm = admin.messaging();
