// app/api/blog/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- config -------------------- */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const BUCKET = process.env.SUPABASE_BUCKET;
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* -------------------- utils -------------------- */
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString(); // <<< FIX: serialize Date
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
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
function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function badRequest(message, field, hint) {
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
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
const parseId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
/** path → public URL */
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** session OR x-admin-key (untuk Postman) */
async function assertAdmin(req) {
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

/** JSON / form-data → { body, file }  (file key: image|file|image_file|image_url) */
async function readBodyAndFile(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const key of ["image", "file", "image_file", "image_url"]) {
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

/* ========= Supabase upload ========= */
async function uploadBlogToSupabase(file) {
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
  const objectPath = `blog/${new Date().toISOString().slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath; // simpan PATH di DB
}

/* ========= Category helpers ========= */
async function resolveCategoryId({ category_id, category_slug }) {
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

/* ========= GET /api/blog (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const includeCategory = searchParams.get("include_category") === "1";

    const category_id = parseId(searchParams.get("category_id"));
    const category_slug = parseId(searchParams.get("category_slug"));

    const where = {
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
                      { name: { contains: q } },
                      { description: { contains: q } },
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
                          { name: { contains: q } },
                          { description: { contains: q } },
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

    const [total, rows] = await Promise.all([
      prisma.blog.count({ where }),
      prisma.blog.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
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
        },
      }),
    ]);

    const data = rows.map((r) => {
      const bt = pickTrans(r.blog_translate, locale, fallback);
      const created_ts = r?.created_at
        ? new Date(r.created_at).getTime()
        : null;
      const updated_ts = r?.updated_at
        ? new Date(r.updated_at).getTime()
        : null;

      const cat = r.category || null;
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
        image_url: toPublicUrl(r.image_url), // ⬅️ public URL
        views_count: r.views_count,
        likes_count: r.likes_count,
        category_id: cat?.id ?? null,
        category_slug: cat?.slug ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
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
    });

    return json({
      message: "OK",
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        locale,
        fallback,
      },
    });
  } catch (err) {
    console.error("GET /api/blog error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar blog. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/blog ========= */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);

    const { body, file } = await readBodyAndFile(req);

    // upload file jika ada, else pakai image_url string
    let image_url = "";
    if (file) {
      try {
        image_url = await uploadBlogToSupabase(file);
      } catch (e) {
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return json(
            {
              error: {
                code: "CONFIG_ERROR",
                message: "Konfigurasi bucket Supabase belum disetel.",
              },
            },
            { status: 500 }
          );
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json(
            {
              error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "Ukuran file melebihi 10MB.",
                field: "file",
              },
            },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            {
              error: {
                code: "UNSUPPORTED_TYPE",
                message: "Format gambar harus JPEG, PNG, atau WebP.",
                field: "file",
              },
            },
            { status: 415 }
          );
        console.error("upload error:", e);
        return json(
          {
            error: {
              code: "UPLOAD_FAILED",
              message: "Gagal mengunggah gambar.",
            },
          },
          { status: 500 }
        );
      }
    } else {
      image_url = String(body?.image_url || "").trim();
    }

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    const description_id =
      body?.description_id !== undefined
        ? String(body.description_id)
        : body?.description !== undefined
        ? String(body.description)
        : null;

    if (!image_url)
      return badRequest(
        "Gambar wajib diisi. Sertakan 'image_url' atau unggah file (image/file/image_file).",
        "image_url",
        "Kirim multipart/form-data untuk upload file."
      );
    if (!name_id)
      return badRequest(
        "Judul Bahasa Indonesia (name_id) wajib diisi.",
        "name_id"
      );

    // Kategori (opsional)
    const category_id_in = body?.category_id
      ? String(body.category_id).trim()
      : null;
    const category_slug_in = body?.category_slug
      ? String(body.category_slug).trim()
      : null;

    let resolvedCategoryId = null;
    try {
      resolvedCategoryId = await resolveCategoryId({
        category_id: category_id_in,
        category_slug: category_slug_in,
      });
    } catch (e) {
      if (e.message === "CATEGORY_NOT_FOUND") {
        return json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Kategori tidak ditemukan.",
              field: e.field,
            },
          },
          { status: 422 }
        );
      }
      throw e;
    }

    // auto-translate
    let name_en = String(body?.name_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";
    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    if (autoTranslate) {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const id = randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.blog.create({
        data: {
          id,
          admin_user_id: adminId,
          image_url,
          category_id: resolvedCategoryId,
        },
      });

      await tx.blog_translate.create({
        data: {
          id_blog: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (name_en || description_en) {
        await tx.blog_translate.create({
          data: {
            id_blog: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        message: "Blog berhasil dibuat.",
        data: {
          id: created.id,
          image_url: toPublicUrl(image_url), // ⬅️ public URL di response
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
          category_id: resolvedCategoryId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/blog error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
