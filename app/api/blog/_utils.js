// app/api/blog/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* =========================
   Config
========================= */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

export const BUCKET = process.env.SUPABASE_BUCKET;
export const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
export const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

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
export function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/* =========================
   Auth (session OR x-admin-key)
========================= */
export async function assertAdmin(req) {
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
   Supabase upload (image)
========================= */
export async function uploadImageToSupabase(file, prefix = "blog") {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024; // 10MB
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if ((file.size || 0) > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (!allowed.includes(file.type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `${prefix}/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath; // simpan PATH (bukan URL) ke DB
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
