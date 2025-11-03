// app/api/prodi/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* ===== env ===== */
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* ===== JSON helpers (BigInt-safe) ===== */
export function sanitize(v) {
  if (v === null || v === undefined) return v;
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

/* ===== standard error responders ===== */
export function badRequest(message, field, hint) {
  return json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(field ? { field } : {}),
        ...(hint ? { hint } : {}),
      },
    },
    { status: 400 }
  );
}
export function unauthorized(message = "Akses ditolak. Silakan login.") {
  return json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}
export function forbidden(message = "Anda tidak memiliki akses.") {
  return json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}
export function notFound(message = "Data tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

/* ===== auth: session OR x-admin-key ===== */
export async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
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

/* ===== parsing helpers ===== */
export function asInt(v, dflt = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
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
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* ===== locale helpers ===== */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";
export function normalizeLocale(v, fallback = DEFAULT_LOCALE) {
  return (v || fallback).toLowerCase().slice(0, 5);
}
export function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ===== timestamp helpers ===== */
export function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}
