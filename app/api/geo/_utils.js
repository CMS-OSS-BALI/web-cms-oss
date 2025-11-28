// app/api/geo/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library";

// === Storage client (baru, sama seperti blog/consultants)
import storageClient from "@/app/utils/storageClient";
// === Cropper (16:9 WebP untuk bendera)
import { cropFileTo16x9Webp } from "@/app/utils/cropper";

/* =========================
   Config & Defaults
========================= */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

// Semua aset publik berada di bawah prefix ini
const PUBLIC_PREFIX = "cms-oss";

// Batas & tipe file gambar
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/* =========================
   JSON helpers
========================= */
export function sanitize(v) {
  if (v === null || v === undefined) return v;

  // Prisma Decimal → number (skala 12,2 aman dikirim sebagai number)
  const isDecimalLike =
    typeof v === "object" &&
    (v instanceof PrismaDecimal ||
      typeof v?.toNumber === "function" ||
      (typeof v?.toString === "function" && "d" in v && "e" in v && "s" in v));
  if (isDecimalLike) {
    return typeof v.toNumber === "function"
      ? v.toNumber()
      : Number(v.toString());
  }
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

export function json(data, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (init.cacheControl && !headers["Cache-Control"]) {
    headers["Cache-Control"] = init.cacheControl;
  }
  const responseInit =
    Object.keys(headers).length > 0 ? { ...init, headers } : init;
  return NextResponse.json(sanitize(data), responseInit);
}

/* =========================
   Small utils
========================= */
export const clampInt = (v, min, max, dflt) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(Math.max(n, min), max);
};

export const parseId = (v) => {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
};

export function parseBigIntId(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  try {
    const n = BigInt(s);
    if (n <= 0n) return null;
    return n;
  } catch {
    return null;
  }
}

export function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
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

export function notFound(message = "Data tidak ditemukan.") {
  return json(
    {
      error: {
        code: "NOT_FOUND",
        message,
      },
    },
    { status: 404 }
  );
}

export function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* =========================
   Public URL Helpers (CDN)
   - Normalisasi ke {BASE}/public/cms-oss/<path>
   - BASE diambil dari OSS_STORAGE_BASE_URL,
     jika host-nya "storage." akan diubah ke "cdn."
========================= */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base; // fallback
  }
}

function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}

/** Ubah key/path/URL lama → URL publik final */
export function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const cdn = computePublicBase();
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  const path = ensurePrefixedKey(s);
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/** Ambil storage key dari public URL (bagian setelah '/public/') */
export function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    // sudah key/path
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) {
    return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  }
  return null;
}

/** Best-effort remover (non-blocking) ke gateway storage */
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
   Auth (NextAuth admin session)
========================= */
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

/* =========================
   Body + File reader
========================= */
export async function readBodyAndFile(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const key of ["image", "file", "image_file", "flag_file"]) {
      const f = form.get(key);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    if (!file && form.get("flag")) body.flag = form.get("flag");
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/* =========================
   Upload (pakai storageClient + cropper 16:9)
========================= */
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
 * Upload bendera negara:
 *  - Validasi tipe & ukuran
 *  - Crop center 16:9 + resize (Sharp di server / Canvas di client)
 *  - Encode ke WebP
 *  - Upload via storageClient.uploadBufferWithPresign
 */
export async function uploadNegaraFlag(file, negaraId) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  await assertImageFileOrThrow(file);

  // Crop ke 16:9 WebP (misal 800x450 untuk flag)
  const cropped = await cropFileTo16x9Webp(file, {
    width: 800,
    quality: 90,
  });

  const fileLike = ensureFileLike(cropped, negaraId);

  const res = await storageClient.uploadBufferWithPresign(fileLike, {
    folder: `${PUBLIC_PREFIX}/negara/${negaraId}`,
    isPublic: true,
  });

  if (!res?.publicUrl) throw new Error("UPLOAD_FAILED");
  return res.publicUrl; // simpan URL publik langsung di kolom flag
}

function ensureFileLike(cropResult, negaraId) {
  if (
    cropResult?.file &&
    typeof cropResult.file.arrayBuffer === "function" &&
    typeof cropResult.file.size === "number"
  ) {
    return cropResult.file;
  }
  if (typeof Buffer === "undefined") {
    throw new Error("Buffer is not available in this environment.");
  }
  const raw = cropResult?.buffer;
  const nodeBuffer = raw && Buffer.isBuffer(raw) ? raw : Buffer.from(raw || []);
  const slice = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  );
  const ext = cropResult?.ext || "webp";
  const type = cropResult?.contentType || "image/webp";
  return {
    name: `negara-${negaraId || "new"}.${ext}`,
    type,
    size: nodeBuffer.byteLength,
    arrayBuffer: async () => slice,
  };
}

/* =========================
   OrderBy
========================= */
export function buildGeoOrderBy(param) {
  const allowed = new Set(["id", "created_at", "updated_at"]);
  const [field = "id", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "id";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }];
}

/* =========================
   INCLUDE helpers (Prisma)
========================= */
export function negaraInclude({ locale, fallback }) {
  return {
    negara_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true },
    },
  };
}

export function provinsiInclude({ locale, fallback }) {
  return {
    provinsi_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true },
    },
  };
}

export function kotaInclude({ locale, fallback }) {
  return {
    kota_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true },
    },
  };
}

/* =========================
   Projectors (row -> API shape)
========================= */
export function projectNegaraRow(row, { locale, fallback }) {
  const tr = pickTrans(row.negara_translate, locale, fallback);
  return {
    id: row.id,
    flag: row.flag ? toPublicUrl(row.flag) : null,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: tr?.name ?? null,
    locale_used: tr?.locale ?? null,
  };
}

export function projectProvinsiRow(row, { locale, fallback }) {
  const tr = pickTrans(row.provinsi_translate, locale, fallback);
  return {
    id: row.id,
    negara_id: row.negara_id,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: tr?.name ?? null,
    locale_used: tr?.locale ?? null,
  };
}

export function projectKotaRow(row, { locale, fallback }) {
  const tr = pickTrans(row.kota_translate, locale, fallback);
  return {
    id: row.id,
    negara_id: row.negara_id, // ❗ sudah tidak pakai provinsi_id
    living_cost: row.living_cost ?? null, // ❗ expose living_cost dari tabel kota
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: tr?.name ?? null,
    locale_used: tr?.locale ?? null,
  };
}

/* =========================
   Resolvers (cek foreign key)
========================= */
export async function resolveNegaraId(raw) {
  const id = parseBigIntId(raw);
  if (!id)
    throw Object.assign(new Error("NEGARA_REQUIRED"), {
      field: "negara_id",
    });

  const exists = await prisma.negara.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists)
    throw Object.assign(new Error("NEGARA_NOT_FOUND"), {
      field: "negara_id",
    });

  return id;
}

export async function resolveProvinsiId(raw) {
  const id = parseBigIntId(raw);
  if (!id)
    throw Object.assign(new Error("PROVINSI_REQUIRED"), {
      field: "provinsi_id",
    });

  const exists = await prisma.provinsi.findUnique({
    where: { id },
    select: { id: true, negara_id: true },
  });
  if (!exists)
    throw Object.assign(new Error("PROVINSI_NOT_FOUND"), {
      field: "provinsi_id",
    });

  return id;
}
