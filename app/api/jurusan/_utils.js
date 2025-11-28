import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library"; // Decimal helper

/* =========================
   Core JSON helpers
========================= */
export function sanitize(v) {
  if (v === null || v === undefined) return v;

  // Date -> ISO string
  if (v instanceof Date) return v.toISOString();

  // Prisma Decimal (v4/v5): toNumber()/toString() dan punya field d/e/s
  const isDecimalLike =
    typeof v === "object" &&
    (typeof v?.toNumber === "function" ||
      (typeof v?.toString === "function" && "d" in v && "e" in v && "s" in v));

  if (isDecimalLike) {
    return typeof v.toNumber === "function"
      ? v.toNumber()
      : Number(v.toString());
  }

  // BigInt -> string (supaya aman di JSON)
  if (typeof v === "bigint") return v.toString();

  // Array
  if (Array.isArray(v)) return v.map(sanitize);

  // Object
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

/* =========================
   Parsing helpers
========================= */

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
      // file skip – endpoint jurusan tidak terima file
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
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof PrismaDecimal) return value;
  if (typeof value === "number") return new PrismaDecimal(value);

  let s = String(value).trim();
  if (!s) return null;

  // Hanya sisakan digit, tanda, dan separator
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

/** Nullable BigInt:
 *  undefined|null|"" -> null
 *  "123" | 123 | 123n -> BigInt(123)
 *  invalid -> null
 */
export function toBigIntNullable(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "bigint") return value;

  try {
    const s = String(value).trim();
    if (!s) return null;
    if (!/^-?\d+$/.test(s)) return null;
    return BigInt(s);
  } catch {
    return null;
  }
}

/** String LongText nullable: undefined|null|"" -> null, lainnya -> trimmed string */
export function toNullableLongText(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/* =========================
   Responses
========================= */

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

/* =========================
   Auth helper
========================= */

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

/* =========================
   Domain helpers
========================= */

export function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Mapper utama jurusan → response JSON-friendly
 *  Sekarang sudah ikut sertakan:
 *  - kota_id (BigInt → string di JSON) — legacy (first kota)
 *  - kota_name (legacy display, first kota)
 *  - kota_ids (array of strings)
 *  - kota_names (array of string)
 */
export function mapJurusan(row, locale, fallback) {
  const t = pickTrans(row.jurusan_translate || [], locale, fallback);
  const created_ts = toTs(row.created_at) ?? toTs(row.updated_at) ?? null;
  const updated_ts = toTs(row.updated_at) ?? null;

  const kotaEntries = Array.isArray(row.kota_multi) ? row.kota_multi : [];
  const kotaIds = kotaEntries
    .map((km) => km?.kota_id)
    .filter((v) => v !== null && v !== undefined)
    .map((v) => v.toString());
  const kotaNames = kotaEntries
    .map((km) => pickTrans(km?.kota?.kota_translate || [], locale, fallback))
    .map((tr) => tr?.name)
    .filter(Boolean);
  const kota_name = kotaNames[0] ?? null;

  return {
    id: row.id,
    college_id: row.college_id,
    kota_id: row.kota_id ?? null,
    kota_ids: kotaIds,
    kota_name,
    kota_names: kotaNames,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    created_ts,
    updated_ts,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
    harga: row.harga ?? null, // Decimal → number via sanitize()
  };
}
