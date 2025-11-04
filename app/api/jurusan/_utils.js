import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library"; // ← NEW

/* ===== env ===== */
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* ===== core json helpers ===== */
export function sanitize(v) {
  if (v === null || v === undefined) return v;

  // Date -> ISO
  if (v instanceof Date) return v.toISOString();

  // Prisma Decimal (v4/v5): ada toNumber()/toString() dan field d/e/s
  const isDecimalLike =
    typeof v === "object" &&
    (typeof v?.toNumber === "function" ||
      (typeof v?.toString === "function" && "d" in v && "e" in v && "s" in v));

  if (isDecimalLike) {
    // skala kita (12,2) aman dikirim sebagai number
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
export function normalizeLocale(v, fallback = "id") {
  return (v || fallback).toLowerCase().slice(0, 5);
}
export function pickTrans(list = [], primary = "id", fallback = "id") {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
export function pickLocale(reqOrUrl, key = "locale", dflt = "id") {
  try {
    const url =
      typeof reqOrUrl === "string" ? new URL(reqOrUrl) : new URL(reqOrUrl.url);
    return (url.searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
export function readQuery(req) {
  const { searchParams } = new URL(req.url);
  return searchParams;
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

/** Parse berbagai format angka/currency → PrismaDecimal|null
 *  Menerima: number | "1.234.567,89" | "1,234,567.89" | "1000000" | "Rp 1.000.000" | "" | null
 */
export function toDecimalNullable(value) {
  // ← NEW
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof PrismaDecimal) return value;
  if (typeof value === "number") return new PrismaDecimal(value);
  let s = String(value).trim();
  if (!s) return null;
  // keep only digits, sign, separators
  s = s.replace(/[^\d,.\-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // dua separator: tentukan decimal dari posisi terakhir
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // hanya koma → decimal
    s = s.replace(",", ".");
  } else {
    // hanya titik → biarkan, tapi buang koma ribuan jika ada
    s = s.replace(/,/g, "");
  }
  if (s === "-" || s === "." || s === "") return null;
  return new PrismaDecimal(s);
}

/** String LongText nullable: undefined|null|"" -> null, lainnya -> trimmed string */
export function toNullableLongText(value) {
  // ← NEW
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/* ===== responses ===== */
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
export function notFound(message = "Not found") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

/* ===== auth ===== */
export async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const any = await prisma.admin_users.findFirst({ select: { id: true } });
    if (!any) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    return { adminId: any.id, via: "header" };
  }
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

/* ===== domain helpers ===== */
export function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

export function mapJurusan(row, locale, fallback) {
  const t = pickTrans(row.jurusan_translate || [], locale, fallback);
  const created_ts = toTs(row.created_at) ?? toTs(row.updated_at) ?? null;
  const updated_ts = toTs(row.updated_at) ?? null;
  return {
    id: row.id,
    college_id: row.college_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    created_ts,
    updated_ts,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
    harga: row.harga ?? null, // Decimal → number via sanitize
    in_take: row.in_take ?? null, // ← NEW
  };
}
