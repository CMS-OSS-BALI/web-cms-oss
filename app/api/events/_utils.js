// /app/api/events/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ==== Storage client (konsisten dengan consultants) ====
import storageClient from "@/app/utils/storageClient";

/* -------------------- config -------------------- */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

// Prefix publik di CDN/gateway
const PUBLIC_PREFIX = "cms-oss";

/* -------------------- sorting allowlist -------------------- */
const SORT_ALLOWLIST = new Set([
  "created_at",
  "updated_at",
  "start_at",
  "end_at",
]);

/* =========================
   Helpers: sanitize & json
========================= */
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
export function notFound(msg = "Data event tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message: msg } }, { status: 404 });
}

/* =========================
   Value parsers
========================= */
export function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
export function toInt(v, dflt = null) {
  if (v === "" || v === undefined || v === null) return dflt;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : dflt;
}
export function toBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}
export function toDate(v) {
  if (!v && v !== 0) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function normPricingType(v) {
  const s = String(v || "").toUpperCase();
  return s === "PAID" ? "PAID" : "FREE";
}
export function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
export function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find?.((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
export const parseId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
export function getOrderBy(param) {
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = SORT_ALLOWLIST.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}

/* =========================
   Public URL helpers (CDN)
========================= */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base; // fallback: pakai base apa adanya
  }
}
function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}
export function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* =========================
   URL → storage key (cleanup)
========================= */
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, "");
  const idx = s.indexOf("/public/");
  if (idx >= 0) return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  return null;
}

/* =========================
   Best-effort remover (batch)
========================= */
export async function removeStorageObjects(urlsOrKeys = []) {
  const keys = urlsOrKeys.map(toStorageKey).filter(Boolean);
  if (!keys.length) return;
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/storage/remove`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
      },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      // fallback endpoint (kalau gateway beda)
      await fetch(`${base}/api/storage/delete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
        },
        body: JSON.stringify({ keys }),
      }).catch(() => {});
    }
  } catch {}
}

/* =========================
   Auth
========================= */
/** session OR x-admin-key (untuk Postman). Return: { adminId, via } */
export async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && process.env.ADMIN_TEST_KEY && key === process.env.ADMIN_TEST_KEY) {
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

/* =========================
   Body & upload
========================= */
export async function readBodyAndFile(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const key of ["banner", "file", "banner_file", "banner_url"]) {
      const f = form.get(key);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

// Allowed mimetypes & size sama dengan consultants
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/**
 * Upload banner event → return PUBLIC URL
 * Akan disimpan pada folder: cms-oss/events/<eventId>/...
 */
export async function uploadEventBanner(file, eventId) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  const type = file?.type || "";
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;

  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");

  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/events/${eventId || "misc"}`,
    isPublic: true,
  });
  // Simpan sebagai URL publik langsung
  return res.publicUrl || null;
}

/* =========================
   Category resolver
========================= */
export async function resolveCategoryId({ category_id, category_slug }) {
  const byId = parseId(category_id);
  const bySlug = parseId(category_slug);
  if (byId) {
    const exists = await prisma.event_categories.findUnique({
      where: { id: byId },
      select: { id: true },
    });
    if (!exists)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_id",
      });
    return byId;
  }
  if (bySlug) {
    const found = await prisma.event_categories.findUnique({
      where: { slug: bySlug },
      select: { id: true },
    });
    if (!found)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_slug",
      });
    return found.id;
  }
  return null;
}
