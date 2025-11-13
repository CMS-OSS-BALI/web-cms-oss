// /app/api/aktivitas/_utils.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import storageClient from "@/app/utils/storageClient";
import { cropFileTo16x9Webp } from "@/app/utils/cropper";

/* -------------------- config -------------------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

/* Storage config (align with consultants) */
export const PUBLIC_PREFIX = "cms-oss";

function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base;
  }
}
function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}
export function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return "";
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* -------------------- tiny utils -------------------- */
export function sanitize(v) {
  if (v === null || v === undefined) return v;
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
export function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
export function toBool(v, dflt = null) {
  if (v === null || v === undefined || v === "") return dflt;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return dflt;
}
export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
export function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
export function getOrderBy(param) {
  const allowed = new Set(["sort", "created_at", "updated_at"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }, { created_at: "desc" }];
}
export const toMs = (d) => {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

/* -------------------- auth -------------------- */
export async function assertAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/* -------------------- body & upload -------------------- */
export async function readBodyAndFile(req) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = contentType.startsWith("multipart/form-data");
  const isUrlEncoded = contentType.startsWith(
    "application/x-www-form-urlencoded"
  );

  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const k of ["image", "file", "image_file", "image_url"]) {
      const f = form.get(k);
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

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
}

/**
 * Upload gambar aktivitas:
 * - Server akan crop center ke rasio 16:9 (pakai cropper.js helper).
 * - Output di-convert ke WebP (via Sharp di server).
 * - Kalau proses crop gagal, fallback upload file original.
 */
export async function uploadAktivitasImage(file, id) {
  if (!file) return null;
  await assertImageFileOrThrow(file);

  let fileToUpload = file;

  try {
    // Crop ke 16:9 dan resize (default width 1280, bisa diatur)
    const { file: croppedFile } = await cropFileTo16x9Webp(file, {
      width: 1280,
      quality: 90,
    });
    if (croppedFile) {
      fileToUpload = croppedFile;
    }
  } catch (err) {
    console.warn(
      "cropFileTo16x9Webp gagal, fallback ke file original:",
      err?.message || err
    );
  }

  const res = await storageClient.uploadBufferWithPresign(fileToUpload, {
    folder: `${PUBLIC_PREFIX}/aktivitas/${id || "misc"}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}
