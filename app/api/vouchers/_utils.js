// app/api/vouchers/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* ========== JSON helpers (BigInt-safe, Date -> ISO) ========== */
export function sanitize(v) {
  if (v == null) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
export function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}

/* ========== standard errors ========== */
export function badRequest(message, field) {
  return json(
    { error: { code: "BAD_REQUEST", message, ...(field ? { field } : {}) } },
    { status: 400 }
  );
}
export function unauthorized(
  message = "Akses ditolak. Silakan login sebagai admin."
) {
  return json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}
export function forbidden(
  message = "Anda tidak memiliki akses ke resource ini."
) {
  return json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}
export function notFound(message = "Voucher tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

/* ========== auth: session OR x-admin-key ========== */
export async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const any = await prisma.admin_users.findFirst({ select: { id: true } });
    if (!any) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    return { adminId: any.id, via: "header" };
  }
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/* ========== parsers ========== */
export function readQuery(req) {
  return new URL(req.url).searchParams;
}
export async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (typeof File !== "undefined" && v instanceof File) continue;
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}
export function toInt(v, d = null) {
  if (v === "" || v == null || v === undefined) return d;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
export function toDate(v) {
  if (!v && v !== 0) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function toBool(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}
export function sanitizeCode(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}
export function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
export function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

/* ========== sorting helper ========== */
export function getOrderBy(sortParam) {
  const allowed = new Set([
    "created_at",
    "updated_at",
    "code",
    "type",
    "value",
    "is_active",
  ]);
  const [field = "created_at", dir = "desc"] = String(sortParam || "").split(
    ":"
  );
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
