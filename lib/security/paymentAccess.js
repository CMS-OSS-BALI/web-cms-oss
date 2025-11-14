import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const PAYMENT_NONCE_SECRET =
  process.env.PAYMENT_NONCE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.CRON_SECRET ||
  "";
const PAYMENT_NONCE_TTL =
  Number(process.env.PAYMENT_NONCE_TTL_MS || 5 * 60 * 1000) || 300_000;

function readSignedTokenFromHeaders(req) {
  return (
    req.headers.get("x-payment-token") ||
    req.headers.get("x-payment-signature") ||
    req.headers.get("x-payment-nonce")
  );
}

function readSignedTokenFromQuery(req) {
  try {
    const url = new URL(req.url);
    for (const key of ["token", "signature", "signed", "nonce"]) {
      const v = url.searchParams.get(key);
      if (v) return v;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getSignedPaymentToken(req, extraCandidate) {
  return (
    extraCandidate ||
    readSignedTokenFromHeaders(req) ||
    readSignedTokenFromQuery(req) ||
    null
  );
}

export function createSignedPaymentToken(orderId, { ttlMs } = {}) {
  if (!orderId) throw new Error("orderId is required");
  if (!PAYMENT_NONCE_SECRET) {
    throw new Error(
      "PAYMENT_NONCE_SECRET (or NEXTAUTH_SECRET) is required to sign payment tokens"
    );
  }
  const payload = {
    order_id: orderId,
    exp: Date.now() + Number(ttlMs || PAYMENT_NONCE_TTL),
    nonce: crypto.randomUUID().replace(/-/g, ""),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", PAYMENT_NONCE_SECRET)
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${signature}`;
}

export function verifySignedPaymentToken(orderId, token) {
  if (!token || !orderId) return false;
  if (!PAYMENT_NONCE_SECRET) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, signatureHex] = parts;
  let payloadJson = "";
  try {
    payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
  } catch {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return false;
  }

  if (parsed.order_id !== orderId) return false;
  const exp = Number(parsed.exp);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  let provided;
  let expected;
  try {
    provided = Buffer.from(signatureHex, "hex");
    const expectedHex = crypto
      .createHmac("sha256", PAYMENT_NONCE_SECRET)
      .update(payloadB64)
      .digest("hex");
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(provided, expected)) return false;

  return typeof parsed.nonce === "string" && parsed.nonce.length >= 8;
}

export async function authenticatePaymentRequest(
  req,
  { orderId, allowSignedNonce = false, extraToken } = {}
) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const cronHeader = req.headers.get("x-cron-key");
  if (cronSecret && cronHeader && cronHeader === cronSecret) {
    return { ok: true, via: "cron" };
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (admin) {
      return { ok: true, via: "admin", adminId: admin.id };
    }
  }

  if (allowSignedNonce && orderId) {
    const token = getSignedPaymentToken(req, extraToken);
    if (token && verifySignedPaymentToken(orderId, token)) {
      return { ok: true, via: "signed_nonce" };
    }
    return {
      ok: false,
      via: null,
      tokenPresent: Boolean(token),
    };
  }

  return { ok: false, via: null, tokenPresent: false };
}
