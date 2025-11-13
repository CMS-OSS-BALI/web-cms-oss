// app/api/bookings/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";

/* ============ JSON helpers ============ */
export function sanitize(v) {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
export function json(data, init) {
  const base = { headers: { "Cache-Control": "no-store" } };
  const merged =
    init?.headers || init?.status
      ? {
          ...base,
          ...init,
          headers: { ...base.headers, ...(init.headers || {}) },
        }
      : base;
  return NextResponse.json(sanitize(data), merged);
}
export function badRequest(message, field) {
  return json(
    { error: { code: "BAD_REQUEST", message, ...(field ? { field } : {}) } },
    { status: 400 }
  );
}
export function notFound(message = "Booking tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

/* ============ Body & parsing utils ============ */
export async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue; // bookings tidak pakai file
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}
export function toIntCurrency(v, dflt = null) {
  if (v === "" || v == null || v === undefined) return dflt;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : dflt;
}
export function sanitizeCode(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

/* ============ Auth ============ */
export async function assertAdmin(req) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

/* ============ Domain helpers ============ */
export async function getEventForBooking(event_id) {
  return prisma.events.findUnique({
    where: { id: event_id },
    select: {
      id: true,
      is_published: true,
      booth_price: true,
      booth_quota: true,
      booth_sold_count: true,
    },
  });
}
export async function getVoucherByCode(code) {
  return prisma.vouchers.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      type: true, // FIXED | PERCENT
      value: true,
      max_discount: true,
      is_active: true,
      max_uses: true,
      used_count: true,
      valid_from: true,
      valid_to: true,
      event_id: true,
    },
  });
}
export function validateVoucher(v, event_id, now = new Date()) {
  if (!v) return "Kode voucher tidak valid";
  if (!v.is_active) return "Voucher tidak aktif";
  if (v.valid_from && v.valid_from > now) return "Voucher belum aktif";
  if (v.valid_to && v.valid_to < now) return "Voucher sudah kedaluwarsa";
  if (v.max_uses != null && v.used_count >= v.max_uses)
    return "Voucher telah mencapai batas pemakaian";
  if (v.event_id && v.event_id !== event_id)
    return "Voucher tidak berlaku untuk event ini";
  return null;
}
export function computeDiscount(basePrice, voucher) {
  if (!voucher) return 0;
  if (voucher.type === "FIXED") {
    return Math.max(0, Math.min(basePrice, voucher.value || 0));
  }
  const pct = Math.max(0, Math.min(100, voucher.value || 0));
  const raw = Math.floor((basePrice * pct) / 100);
  const capped =
    voucher.max_discount != null
      ? Math.min(raw, Math.max(0, voucher.max_discount))
      : raw;
  return Math.max(0, Math.min(basePrice, capped));
}
export function genOrderId() {
  return `BB-${Date.now()}-${randomUUID().slice(0, 8)}`;
}
