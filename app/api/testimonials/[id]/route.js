// app/api/testimonials/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { cropFileTo9x16Webp } from "@/app/utils/cropper";

// Storage client baru
import storageClient from "@/app/utils/storageClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const PUBLIC_PREFIX = "cms-oss/testimonials";

/* =========================
   Public URL helpers
========================= */
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
function toPublicUrl(keyOrUrl) {
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

/* =========================
   URL → storage key (untuk cleanup)
========================= */
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    // sudah key/path
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  return null;
}

/* =========================
   Best-effort remover (batch)
   Panggil gateway /api/storage/remove
========================= */
async function removeStorageObjects(urlsOrKeys = []) {
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
  } catch (_) {}
}

/* =========================
   Auth & Utils
========================= */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}
function authError(err) {
  const status = err?.status === 401 ? 401 : 403;
  return NextResponse.json(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status }
  );
}
function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
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
function parseId(params) {
  const raw = params?.id;
  const s = String(raw ?? "").trim();
  return s || null;
}

/* =========================
   Upload (crop 9:16 → WebP)
========================= */
async function uploadTestimonialImage9x16(file) {
  if (typeof File === "undefined" || !(file instanceof File)) {
    throw new Error("NO_FILE");
  }
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");

  const processed = await cropFileTo9x16Webp(file, {
    height: 1920,
    quality: 90,
  });

  let { buffer, contentType } = processed || {};
  if (!buffer) {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } else if (buffer instanceof ArrayBuffer) {
    buffer = Buffer.from(buffer);
  } else if (ArrayBuffer.isView(buffer)) {
    buffer = Buffer.from(buffer.buffer);
  }
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!buffer?.length) throw new Error("EMPTY_FILE_BUFFER");

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const folder = `${PUBLIC_PREFIX}/${new Date().toISOString().slice(0, 10)}`;

  const blobFile = new File([buffer], filename, {
    type: contentType || "image/webp",
  });
  const res = await storageClient.uploadBufferWithPresign(blobFile, {
    folder,
    isPublic: true,
  });

  const publicUrl = res?.publicUrl || null;
  if (!publicUrl) throw new Error("UPLOAD_FAILED");
  return publicUrl;
}

/* ================ GET (detail) ================ */
export async function GET(req, { params }) {
  try {
    const id = parseId(params);
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
      select: { id: true, locale: true, name: true, message: true },
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

    const image_public_url = toPublicUrl(item.photo_url);

    const resp = NextResponse.json({
      data: {
        id: item.id,
        photo_url: item.photo_url, // bisa URL publik / key lama
        photo_public_url: image_public_url, // normalisasi ke URL publik
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
    resp.headers.set("Cache-Control", "no-store");
    resp.headers.set("Vary", "Cookie, Accept-Language");
    return resp;
  } catch (e) {
    console.error("GET /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================ PUT (update) ================ */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const id = parseId(params);
  if (!id) return NextResponse.json({ message: "Bad id" }, { status: 400 });

  // Snapshot existing
  const base = await prisma.testimonials.findUnique({
    where: { id },
    select: { id: true, photo_url: true, deleted_at: true },
  });
  if (!base || base.deleted_at) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

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
  const star = parseStar(body.star);
  if (body.star !== undefined && star === null) {
    return NextResponse.json(
      { message: "star harus integer 1-5" },
      { status: 422 }
    );
  }

  const youtube_url = normalizeYoutubeUrl(body.youtube_url);
  const kampus_negara_tujuan =
    body.kampus_negara_tujuan === undefined && body.campusCountry === undefined
      ? undefined
      : (body.kampus_negara_tujuan ?? body.campusCountry ?? "")
          .toString()
          .trim()
          .slice(0, 255);

  // Category
  let categoryId;
  try {
    categoryId = await (async () => {
      const category_id = body.category_id;
      const category_slug = body.category_slug;
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
    })();
  } catch (err) {
    if (err?.message === "CATEGORY_NOT_FOUND")
      return NextResponse.json(
        { message: "Kategori tidak ditemukan" },
        { status: 422 }
      );
    throw err;
  }

  // Upload baru?
  let newPhotoUrl = undefined;
  if (uploadFile && typeof File !== "undefined" && uploadFile instanceof File) {
    try {
      newPhotoUrl = await uploadTestimonialImage9x16(uploadFile); // URL publik
    } catch (e) {
      if (e?.message === "PAYLOAD_TOO_LARGE")
        return NextResponse.json({ message: "Maksimal 10MB" }, { status: 413 });
      if (e?.message === "UNSUPPORTED_TYPE")
        return NextResponse.json(
          { message: "Format harus JPEG/PNG/WebP" },
          { status: 415 }
        );
      console.error("uploadTestimonialImage error:", e);
      return NextResponse.json(
        { message: "Upload gambar gagal" },
        { status: 500 }
      );
    }
  } else if (body.photo_url !== undefined) {
    const trimmed = trimOrNull(body.photo_url, 255);
    newPhotoUrl = trimmed === null ? null : trimmed; // bisa kosongkan gambar
  }

  const parentPatch = {};
  if (newPhotoUrl !== undefined) parentPatch.photo_url = newPhotoUrl;
  if (star !== undefined) parentPatch.star = star;
  if (youtube_url !== undefined) parentPatch.youtube_url = youtube_url;
  if (kampus_negara_tujuan !== undefined)
    parentPatch.kampus_negara_tujuan = kampus_negara_tujuan || null;
  if (categoryId !== undefined) parentPatch.category_id = categoryId;

  let postCleanupPhoto = null;
  if (Object.keys(parentPatch).length) {
    // jika fotonya diganti, catat yang lama untuk cleanup
    if (
      newPhotoUrl !== undefined &&
      base.photo_url &&
      base.photo_url !== newPhotoUrl
    ) {
      postCleanupPhoto = base.photo_url;
    }
    await prisma.testimonials.update({ where: { id }, data: parentPatch });
  }

  // Upsert translation
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

  const image_public_url = toPublicUrl(latest?.photo_url ?? null);

  // cleanup best-effort (hapus foto lama jika diganti)
  if (postCleanupPhoto) {
    try {
      await removeStorageObjects([postCleanupPhoto]);
    } catch {}
  }

  const resp = NextResponse.json({
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
  resp.headers.set("Cache-Control", "no-store");
  resp.headers.set("Vary", "Cookie, Accept-Language");
  return resp;
}

/* ================ DELETE (soft delete) ================ */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const id = parseId(params);
  if (!id) return NextResponse.json({ message: "Bad id" }, { status: 400 });

  const deleted = await prisma.testimonials.update({
    where: { id },
    data: { deleted_at: new Date() },
    select: { id: true, deleted_at: true },
  });

  return NextResponse.json({ data: deleted });
}
