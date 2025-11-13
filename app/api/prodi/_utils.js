import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library"; // NEW

/* ===== core json helpers (Date/Decimal/BigInt-safe) ===== */
export function sanitize(v) {
  if (v === null || v === undefined) return v;

  // Date -> ISO
  if (v instanceof Date) return v.toISOString();

  // Prisma Decimal (v4/v5)
  const isDecimalLike =
    typeof v === "object" &&
    (typeof v?.toNumber === "function" ||
      (typeof v?.toString === "function" && "d" in v && "e" in v && "s" in v));
  if (isDecimalLike) {
    return typeof v.toNumber === "function"
      ? v.toNumber()
      : Number(v.toString());
  }

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

/* ===== parsing helpers ===== */
export function asInt(v, dflt = null) {
  if (v === null || v === undefined || v === "") return dflt;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : dflt;
}
export function readQuery(req) {
  return new URL(req.url).searchParams;
}
export async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
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

/* ===== timestamp helper ===== */
export function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Parse berbagai format angka/currency → PrismaDecimal|null */
export function toDecimalNullable(value) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof PrismaDecimal) return value;
  if (typeof value === "number") return new PrismaDecimal(value);
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/[^\d,.\-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  if (s === "-" || s === "." || s === "") return null;
  return new PrismaDecimal(s);
}

/** String LongText nullable */
export function toNullableLongText(value) {
  // ← NEW
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
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

/* ===== auth: NextAuth admin session ===== */
export async function assertAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return { adminId: admin.id, via: "session" };
}
