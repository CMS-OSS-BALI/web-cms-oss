// app/api/blog/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// === Storage client (baru, sama seperti consultants)
import storageClient from "@/app/utils/storageClient";

/* =========================
   Config & Defaults
========================= */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

// Untuk akses admin via header (opsional)
export const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

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
  // default no-store supaya tidak misleading saat data berubah
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
export function notFound(message = "Data blog tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
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
   Auth (session OR x-admin-key)
========================= */
export async function assertAdmin(req) {
  // Header override (opsional untuk internal tools)
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw new Response("Forbidden", { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
  }
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
    for (const key of ["image", "file", "image_file"]) {
      const f = form.get(key);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    if (!file && form.get("image_url")) body.image_url = form.get("image_url");
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/* =========================
   Upload (pakai storageClient)
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

/** Upload gambar blog → simpan URL publik langsung di DB */
export async function uploadBlogImage(file, blogId) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/blog/${blogId}`,
    isPublic: true,
  });
  if (!res?.publicUrl) throw new Error("UPLOAD_FAILED");
  return res.publicUrl; // simpan URL publik langsung
}

/* =========================
   Category helpers
========================= */
export async function resolveCategoryId({ category_id, category_slug }) {
  const byId = parseId(category_id);
  const bySlug = parseId(category_slug);
  if (byId) {
    const exists = await prisma.blog_categories.findUnique({
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
    const found = await prisma.blog_categories.findUnique({
      where: { slug: bySlug },
      select: { id: true },
    });
    if (!found)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_slug",
      });
    return found.id;
  }
  return null; // optional
}

/* =========================
   Query helpers (WHERE/INCLUDE/ORDER)
========================= */
export function buildOrderBy(param) {
  const allowed = new Set([
    "created_at",
    "updated_at",
    "views_count",
    "likes_count",
  ]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}

export function buildBlogWhere({
  q,
  locale = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE,
  category_id,
  category_slug,
  withDeleted = false,
  onlyDeleted = false,
}) {
  return {
    ...(onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null }),
    ...(q
      ? {
          OR: [
            {
              blog_translate: {
                some: {
                  locale: { in: [locale, fallback] },
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
            {
              category: {
                is: {
                  translate: {
                    some: {
                      locale: { in: [locale, fallback] },
                      OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(category_id ? { category_id } : {}),
    ...(category_slug ? { category: { slug: category_slug } } : {}),
  };
}

export function blogInclude({ locale, fallback, includeCategory }) {
  return {
    blog_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true, description: true },
    },
    ...(includeCategory
      ? {
          category: {
            select: {
              id: true,
              slug: true,
              sort: true,
              translate: {
                where: { locale: { in: [locale, fallback] } },
                select: { locale: true, name: true, description: true },
              },
            },
          },
        }
      : { category: { select: { id: true, slug: true } } }),
  };
}

/* =========================
   Projectors (row -> API shape)
========================= */
export function projectBlogRow(r, { locale, fallback, includeCategory }) {
  const bt = pickTrans(r.blog_translate, locale, fallback);
  const cat = r.category || null;
  const created_ts = r?.created_at ? new Date(r.created_at).getTime() : null;
  const updated_ts = r?.updated_at ? new Date(r.updated_at).getTime() : null;

  let category_name = null;
  let category_description = null;
  let category_locale_used = null;
  if (includeCategory && cat?.translate) {
    const ct = pickTrans(cat.translate, locale, fallback);
    category_name = ct?.name ?? null;
    category_description = ct?.description ?? null;
    category_locale_used = ct?.locale ?? null;
  }

  return {
    id: r.id,
    // DB sekarang menyimpan URL publik langsung,
    // tapi toPublicUrl tetap aman untuk legacy key/path
    image_url: toPublicUrl(r.image_url),
    views_count: r.views_count,
    likes_count: r.likes_count,
    category_id: cat?.id ?? null,
    category_slug: cat?.slug ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
    created_ts,
    updated_ts,
    name: bt?.name ?? null,
    description: bt?.description ?? null,
    locale_used: bt?.locale ?? null,
    ...(includeCategory
      ? {
          category_name,
          category_description,
          category_locale_used,
          category_sort: cat?.sort ?? null,
        }
      : {}),
  };
}
