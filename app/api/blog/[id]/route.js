// app/api/blog/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
function notFound() {
  return json(
    { error: { code: "NOT_FOUND", message: "Data blog tidak ditemukan." } },
    { status: 404 }
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

/** session OR x-admin-key */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    return anyAdmin;
  }
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return admin;
}

/** JSON / form-data → { body, file } */
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

/* ========= Supabase ========= */
async function uploadBlogToSupabase(file) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
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

  return objectPath;
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
  return null;
}

/* ========= GET /api/blog/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const includeCategory =
      new URL(req.url).searchParams.get("include_category") === "1";

    const item = await prisma.blog.findFirst({
      where: { id, deleted_at: null },
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
    });
    if (!item) return notFound();

    const t = pickTrans(item.blog_translate, locale, fallback);
    const created_ts = item?.created_at
      ? new Date(item.created_at).getTime()
      : null;
    const updated_ts = item?.updated_at
      ? new Date(item.updated_at).getTime()
      : null;

    let category_name = null;
    let category_description = null;
    let category_locale_used = null;
    if (includeCategory && item.category?.translate) {
      const ct = pickTrans(item.category.translate, locale, fallback);
      category_name = ct?.name ?? null;
      category_description = ct?.description ?? null;
      category_locale_used = ct?.locale ?? null;
    }

    return json({
      message: "OK",
      data: {
        id: item.id,
        image_url: toPublicUrl(item.image_url), // ⬅️ public URL
        views_count: item.views_count,
        likes_count: item.likes_count,
        category_id: item.category?.id ?? null,
        category_slug: item.category?.slug ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts,
        updated_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
        ...(includeCategory
          ? {
              category_name,
              category_description,
              category_locale_used,
              category_sort: item.category?.sort ?? null,
            }
          : {}),
      },
    });
  } catch (err) {
    console.error(`GET /api/blog/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail blog. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/blog/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);

    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const { body, file } = await readBodyAndFile(req);

    const data = {};
    const ops = [];
    let name_id_new, desc_id_new;
    let autoTranslate = false;

    // upload file menang, else pakai image_url
    if (file) {
      try {
        data.image_url = await uploadBlogToSupabase(file);
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
    } else if ("image_url" in body) {
      const v = String(body.image_url || "").trim();
      data.image_url = v || null;
    }

    if ("views_count" in body) {
      const v = parseInt(body.views_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest(
          "views_count harus bilangan bulat >= 0.",
          "views_count"
        );
      data.views_count = v;
    }
    if ("likes_count" in body) {
      const v = parseInt(body.likes_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest(
          "likes_count harus bilangan bulat >= 0.",
          "likes_count"
        );
      data.likes_count = v;
    }

    if ("name_id" in body || "description_id" in body) {
      name_id_new = "name_id" in body ? String(body.name_id) : undefined;
      desc_id_new =
        "description_id" in body ? String(body.description_id) : undefined;

      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "id" } },
          update: {
            ...(name_id_new !== undefined
              ? { name: (name_id_new || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_id_new !== undefined
              ? { description: desc_id_new || null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: "id",
            name: (name_id_new || "(no title)").slice(0, 191),
            description: desc_id_new || null,
          },
        })
      );
    }

    if ("name_en" in body || "description_en" in body) {
      const name_en = "name_en" in body ? String(body.name_en) : undefined;
      const desc_en =
        "description_en" in body ? String(body.description_en) : undefined;

      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "en" } },
          update: {
            ...(name_en !== undefined
              ? { name: (name_en || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_en !== undefined ? { description: desc_en || null } : {}),
          },
          create: {
            id_blog: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en || null,
          },
        })
      );
    }

    // Kategori (opsional)
    let category_id,
      category_slug,
      categoryChanged = false;
    if ("category_id" in body || "category_slug" in body) {
      category_id =
        "category_id" in body
          ? String(body.category_id || "").trim()
          : undefined;
      category_slug =
        "category_slug" in body
          ? String(body.category_slug || "").trim()
          : undefined;
      categoryChanged = true;
    }
    if (categoryChanged) {
      try {
        const resolved = await resolveCategoryId({
          category_id,
          category_slug,
        });
        data.category_id = resolved;
      } catch (e) {
        if (e.message === "CATEGORY_NOT_FOUND")
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
        throw e;
      }
    }

    autoTranslate = String(body?.autoTranslate ?? "false") === "true";

    if (Object.keys(data).length) data.updated_at = new Date();
    if (Object.keys(data).length) {
      await prisma.blog.update({ where: { id }, data });
    } else {
      const exists = await prisma.blog.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    if (
      autoTranslate &&
      (name_id_new !== undefined || desc_id_new !== undefined)
    ) {
      const name_en_auto = name_id_new
        ? await translate(String(name_id_new), "id", "en")
        : undefined;
      const desc_en_auto =
        desc_id_new !== undefined
          ? await translate(String(desc_id_new || ""), "id", "en")
          : undefined;

      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "en" } },
          update: {
            ...(name_en_auto ? { name: name_en_auto.slice(0, 191) } : {}),
            ...(desc_en_auto !== undefined
              ? { description: desc_en_auto ?? null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: "en",
            name: (name_en_auto || "(no title)").slice(0, 191),
            description: desc_en_auto ?? null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    const updated = await prisma.blog.findUnique({
      where: { id },
      select: { id: true, image_url: true, category_id: true },
    });

    return json({
      message: "Blog berhasil diperbarui.",
      data: {
        id: updated?.id || id,
        image_url: toPublicUrl(updated?.image_url ?? null), // ⬅️ public URL
        category_id: updated?.category_id ?? null,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/blog/${params?.id} error:`, err);
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

/* ========= DELETE /api/blog/:id ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.blog.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({
      message: "Blog berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/blog/${params?.id} error:`, err);
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
