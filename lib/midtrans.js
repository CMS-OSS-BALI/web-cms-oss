// lib/midtrans.js
import crypto from "crypto";

const IS_PROD =
  String(process.env.MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";

const SNAP_BASE = IS_PROD
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

// Core API (cek status, dsb)
const CORE_BASE = IS_PROD
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

// Default expiry (5–1440 menit agar aman)
const EXPIRY_MINUTES = (() => {
  const n = parseInt(process.env.MIDTRANS_EXPIRY_MINUTES || "30", 10);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(1440, n));
})();

function authHeader() {
  if (!MIDTRANS_SERVER_KEY) throw new Error("MIDTRANS_SERVER_KEY not set");
  const token = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64");
  return `Basic ${token}`;
}

export function makeOrderId(prefix = "OSS") {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now();
  return `${prefix}-${ts}-${rand}`;
}

export function ensureIntegerIDR(n, baseAmount) {
  const v = Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 0;
  if (v < 0) return baseAmount ?? 0;
  return v;
}

/** Safety builder for Snap expiry */
function buildExpiry(expiryOpt) {
  const allowedUnits = new Set(["minutes", "hours", "days"]);
  const unitRaw = String(expiryOpt?.unit || "minutes").toLowerCase();
  const unit = allowedUnits.has(unitRaw) ? unitRaw : "minutes";

  const durRaw = Number(expiryOpt?.duration);
  const duration = Number.isFinite(durRaw)
    ? Math.trunc(durRaw)
    : EXPIRY_MINUTES;

  if (unit === "minutes") {
    return { unit, duration: Math.max(5, Math.min(1440, duration)) };
  }
  if (unit === "hours") {
    return { unit, duration: Math.max(1, Math.min(24, duration)) };
  }
  return { unit, duration: Math.max(1, Math.min(7, duration)) };
}

/**
 * Normalisasi enabled_payments:
 * - "all" (string)   -> return null  (jangan kirim properti enabled_payments)
 * - array/string list -> array dedupe, tambahkan "qris" jika ada "other_qris"
 * - undefined         -> baca ENV (default "all")
 */
export function normalizeEnabledPayments(input) {
  // Jika input kosong, fallback ke ENV (default "all")
  let raw =
    input == null ? process.env.MIDTRANS_ENABLED_PAYMENTS || "all" : input;

  // "all" → null (biar Snap menampilkan semua channel aktif di dashboard)
  if (typeof raw === "string" && raw.trim().toLowerCase() === "all") {
    return null;
  }

  // String "a,b,c" → array
  let list = Array.isArray(raw)
    ? raw
    : String(raw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  // Jika cuma ada "other_qris", tambahkan "qris" agar QRIS selalu muncul
  if (list.includes("other_qris") && !list.includes("qris")) {
    list.unshift("qris");
  }

  // Dedupe & return. Jika hasil kosong → null (anggap "all")
  list = Array.from(new Set(list));
  return list.length ? list : null;
}

/** Buat Snap transaction (token + redirect_url) */
export async function snapCreate(opts) {
  const order_id = opts.order_id || makeOrderId();

  // Tentukan enabled_payments final
  const enabled = normalizeEnabledPayments(opts.enabled_payments);

  const baseBody = {
    transaction_details: {
      order_id,
      gross_amount: ensureIntegerIDR(opts.amount, opts.amount),
    },
    item_details: (opts.items || []).map((it) => ({
      id: it.id || "item",
      price: ensureIntegerIDR(it.price, it.price),
      quantity: ensureIntegerIDR(it.quantity, it.quantity),
      name: it.name,
      category: it.category,
    })),
    customer_details: {
      first_name: opts.customer?.first_name,
      last_name: opts.customer?.last_name,
      email: opts.customer?.email,
      phone: opts.customer?.phone,
    },
    credit_card: { secure: true },
    metadata: opts.metadata || {},
    expiry: buildExpiry(opts.expiry),
  };

  // Jika enabled === null, JANGAN kirim field "enabled_payments" → tampilkan semua channel aktif
  const body =
    enabled === null ? baseBody : { ...baseBody, enabled_payments: enabled };

  const res = await fetch(`${SNAP_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.status_message || "Midtrans error");
    err.info = json;
    err.status = res.status;
    throw err;
  }

  return { token: json?.token, redirect_url: json?.redirect_url, order_id };
}

/** Cek status transaksi di Midtrans Core API */
export async function fetchStatus(order_id) {
  if (!order_id) throw new Error("order_id required");
  const res = await fetch(
    `${CORE_BASE}/${encodeURIComponent(order_id)}/status`,
    {
      method: "GET",
      headers: { Authorization: authHeader() },
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.status_message || "Midtrans status error");
    err.info = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

export function verifySignature({
  order_id,
  status_code,
  gross_amount,
  signature_key,
}) {
  // gunakan raw string gross_amount dari webhook; bandingkan lowercase
  const raw = `${String(order_id)}${String(status_code)}${String(
    gross_amount
  )}${MIDTRANS_SERVER_KEY}`;
  const hash = crypto.createHash("sha512").update(raw).digest("hex");
  return (
    String(hash).toLowerCase() === String(signature_key || "").toLowerCase()
  );
}

export function mapStatus(note) {
  const t = String(note?.transaction_status || "").toLowerCase();
  const fraud = String(note?.fraud_status || "").toLowerCase();

  if (t === "capture") {
    if (fraud === "challenge") return "review";
    return "paid";
  }
  if (t === "settlement") return "paid";
  if (t === "pending") return "pending";
  if (t === "cancel" || t === "cancelled") return "cancelled";
  if (t === "expire" || t === "expired") return "expired";
  if (
    [
      "deny",
      "failure",
      "failed",
      "refund",
      "partial_refund",
      "chargeback",
      "partial_chargeback",
    ].includes(t)
  )
    return "failed";
  return "pending";
}
