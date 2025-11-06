import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cropFileTo16x9Webp } from "@/app/utils/cropper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =============== Auth & Shared Helpers =============== */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
  }
}

const BUCKET = process.env.SUPABASE_BUCKET;
function isHttpUrl(path) {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}
function normalizeImageUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}
function pickExtFromMime(type) {
  if (!type) return null;
  if (/image\/webp/i.test(type)) return "webp";
  if (/image\/png/i.test(type)) return "png";
  if (/image\/jpe?g/i.test(type)) return "jpg";
  return null;
}
function extFromName(name) {
  if (typeof name !== "string") return null;
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : null;
}
function getPublicUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  if (!BUCKET) return normalizeImageUrl(path);
  try {
    if (!supabaseAdmin?.storage) return normalizeImageUrl(path);
    const { data, error } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);
    if (error) return normalizeImageUrl(path);
    return data?.publicUrl || normalizeImageUrl(path);
  } catch {
    return normalizeImageUrl(path);
  }
}
function trimOrNull(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
function parseStar(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 1 && i <= 5 ? i : null;
}
function normalizeYoutubeUrl(u) {
  if (u === undefined) return undefined;
  const s = trimOrNull(u, 255);
  if (!s) return null;
  try {
    const url = new URL(s);
    if (!/^https?:/.test(url.protocol)) return null;
    return url.toString().slice(0, 255);
  } catch {
    return null;
  }
}

async function uploadTestimonialImage16x9(file) {
  if (typeof File === "undefined" || !(file instanceof File))
    throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const size = file.size || 0;
  const type = file.type || "";
  if (size > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const processed = await cropFileTo16x9Webp(file, {
    width: 1280,
    height: 720,
    quality: 90,
  });

  let { buffer, contentType, ext } = processed || {};

  if (!buffer) {
    const original = await file.arrayBuffer();
    buffer = Buffer.from(original);
  } else if (buffer instanceof ArrayBuffer) {
    buffer = Buffer.from(buffer);
  } else if (ArrayBuffer.isView(buffer)) {
    buffer = Buffer.from(buffer.buffer);
  }
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  if (!buffer?.length) throw new Error("EMPTY_FILE_BUFFER");

  const fallbackType = file.type || "application/octet-stream";
  contentType = (contentType || fallbackType || "").toString() || fallbackType;
  ext = (ext && String(ext).trim()) || pickExtFromMime(contentType) || extFromName(file.name) || "bin";

  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const objectPath = `testimonials/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });
  if (error) throw new Error(error.message);
  return objectPath;
}

async function resolveCategoryId({ category_id, category_slug }) {
  if (category_id === null || category_id === "") return null;
  if (category_slug === null || category_slug === "") return null;
  if (typeof category_id === "string" && category_id.trim()) {
    const found = await prisma.testimonial_categories.findUnique({
      where: { id: category_id.trim() },
      select: { id: true },
    });
    if (!found) throw new Error("CATEGORY_NOT_FOUND");
    return found.id;
  }
  if (typeof category_slug === "string" && category_slug.trim()) {
    const found = await prisma.testimonial_categories.findUnique({
      where: { slug: category_slug.trim().toLowerCase() },
      select: { id: true },
    });
    if (!found) throw new Error("CATEGORY_NOT_FOUND");
    return found.id;
  }
  return undefined;
}

/* ================ GET (detail) ================ */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const locale = getLocaleFromReq(req);

    const item = await prisma.testimonials.findUnique({
      where: { id },
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        kampus_negara_tujuan: true,
        category_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (!item || item.deleted_at)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const tr = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: id,
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });
    const picked =
      tr.find((t) => t.locale === locale) ||
      tr.find((t) => t.locale === "id") ||
      null;

    let category = null;
    if (item.category_id) {
      const cat = await prisma.testimonial_categories.findUnique({
        where: { id: item.category_id },
        select: { id: true, slug: true },
      });
      if (cat) {
        const i18n =
          (await prisma.testimonial_categories_translate.findFirst({
            where: {
              category_id: cat.id,
              locale: locale === "id" ? "id" : { in: [locale, "id"] },
            },
            orderBy: [{ locale: "desc" }],
          })) || null;
        category = { id: cat.id, slug: cat.slug, name: i18n?.name ?? null };
      }
    }

    const image_public_url = getPublicUrl(item.photo_url);

    return NextResponse.json({
      data: {
        id: item.id,
        photo_url: item.photo_url,
        photo_public_url: image_public_url,
        image_public_url,
        star: item.star ?? null,
        youtube_url: item.youtube_url ?? null,
        kampus_negara_tujuan: item.kampus_negara_tujuan ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: picked?.name ?? null,
        message: picked?.message ?? null,
        locale: picked?.locale ?? null,
        category,
      },
    });
  } catch (e) {
    console.error("GET /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================ PUT (update) ================ */
export async function PUT(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;

    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    const isMultipart = contentType.startsWith("multipart/form-data");
    const isUrlEncoded = contentType.startsWith(
      "application/x-www-form-urlencoded"
    );

    let body = {};
    let uploadFile = null;

    if (isMultipart || isUrlEncoded) {
      let form;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json(
          {
            message:
              "Body form-data tidak valid. Gunakan Body=form-data dan biarkan header otomatis.",
          },
          { status: 400 }
        );
      }
      uploadFile = form.get("file") || null;
      const maybeFile = form.get("photo_url");
      if (
        !uploadFile &&
        typeof File !== "undefined" &&
        maybeFile instanceof File
      ) {
        uploadFile = maybeFile;
      }
      const obj = {};
      for (const [k, v] of form.entries()) {
        if (v instanceof File) continue;
        obj[k] = v;
      }
      body = obj;
    } else {
      body = (await req.json().catch(() => ({}))) ?? {};
    }

    const locale = (body.locale || "id").slice(0, 5).toLowerCase();

    const base = await prisma.testimonials.findUnique({ where: { id } });
    if (!base || base.deleted_at)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const star = parseStar(body.star);
    if (body.star !== undefined && star === null)
      return NextResponse.json(
        { message: "star harus integer 1-5" },
        { status: 422 }
      );

    const youtube_url = normalizeYoutubeUrl(body.youtube_url);
    const kampus_negara_tujuan =
      body.kampus_negara_tujuan === undefined &&
      body.campusCountry === undefined
        ? undefined
        : (body.kampus_negara_tujuan ?? body.campusCountry ?? "")
            .toString()
            .trim()
            .slice(0, 255);

    let categoryId;
    try {
      categoryId = await resolveCategoryId({
        category_id: body.category_id,
        category_slug: body.category_slug,
      });
    } catch (err) {
      if (err?.message === "CATEGORY_NOT_FOUND")
        return NextResponse.json(
          { message: "Kategori tidak ditemukan" },
          { status: 422 }
        );
      throw err;
    }

    let storedPhotoPath = undefined;
    if (
      uploadFile &&
      typeof File !== "undefined" &&
      uploadFile instanceof File
    ) {
      try {
        // ⬇️ crop 16:9 sebelum upload
        storedPhotoPath = await uploadTestimonialImage16x9(uploadFile);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return NextResponse.json(
            { message: "Maksimal 10MB" },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return NextResponse.json(
            { message: "Format harus JPEG/PNG/WebP" },
            { status: 415 }
          );
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return NextResponse.json(
            { message: "Supabase bucket belum dikonfigurasi" },
            { status: 500 }
          );
        console.error("uploadTestimonialImage error:", e);
        return NextResponse.json(
          { message: "Upload gambar gagal" },
          { status: 500 }
        );
      }
    } else if (body.photo_url !== undefined) {
      const trimmed = trimOrNull(body.photo_url, 255);
      storedPhotoPath = trimmed === null ? null : trimmed;
    }

    const parentPatch = {};
    if (storedPhotoPath !== undefined) parentPatch.photo_url = storedPhotoPath;
    if (star !== undefined) parentPatch.star = star;
    if (youtube_url !== undefined) parentPatch.youtube_url = youtube_url;
    if (kampus_negara_tujuan !== undefined)
      parentPatch.kampus_negara_tujuan = kampus_negara_tujuan || null;
    if (categoryId !== undefined) parentPatch.category_id = categoryId;

    if (Object.keys(parentPatch).length) {
      await prisma.testimonials.update({ where: { id }, data: parentPatch });
    }

    const name = trimOrNull(body.name, 191);
    const message = trimOrNull(body.message, 10000);
    if (name !== null || message !== null) {
      const exist = await prisma.testimonials_translate.findFirst({
        where: { id_testimonials: id, locale },
      });
      if (exist) {
        await prisma.testimonials_translate.update({
          where: { id: exist.id },
          data: {
            ...(name !== null ? { name } : {}),
            ...(message !== null ? { message } : {}),
          },
        });
      } else {
        await prisma.testimonials_translate.create({
          data: {
            id_testimonials: id,
            locale,
            name: name ?? "",
            message: message ?? "",
          },
        });
      }
    }

    const latest = await prisma.testimonials.findUnique({
      where: { id },
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        kampus_negara_tujuan: true,
        category_id: true,
        updated_at: true,
      },
    });

    let category = null;
    if (latest?.category_id) {
      const cat = await prisma.testimonial_categories.findUnique({
        where: { id: latest.category_id },
        select: { id: true, slug: true },
      });
      if (cat) {
        const i18n =
          (await prisma.testimonial_categories_translate.findFirst({
            where: {
              category_id: cat.id,
              locale: locale === "id" ? "id" : { in: [locale, "id"] },
            },
            orderBy: [{ locale: "desc" }],
          })) || null;
        category = { id: cat.id, slug: cat.slug, name: i18n?.name ?? null };
      }
    }

    const trs = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: id,
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });
    const picked =
      trs.find((t) => t.locale === locale) ||
      trs.find((t) => t.locale === "id") ||
      null;

    const image_public_url = getPublicUrl(latest?.photo_url ?? null);

    return NextResponse.json({
      data: {
        id,
        photo_url: latest?.photo_url ?? null,
        photo_public_url: image_public_url,
        image_public_url,
        star: latest?.star ?? null,
        youtube_url: latest?.youtube_url ?? null,
        kampus_negara_tujuan: latest?.kampus_negara_tujuan ?? null,
        name: picked?.name ?? null,
        message: picked?.message ?? null,
        locale: picked?.locale ?? null,
        category,
        updated_at: latest?.updated_at ?? new Date(),
      },
    });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("PUT /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================ DELETE (soft delete) ================ */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const deleted = await prisma.testimonials.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return NextResponse.json({ data: deleted });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("DELETE /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
