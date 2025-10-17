import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* ===================== Auth & Helpers ===================== */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

const MAX_NAME_LENGTH = 191;
const MAX_TEXT_LENGTH = 10000;
const BUCKET = process.env.SUPABASE_BUCKET;

function isHttpUrl(path) {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}
function normalizeImageUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
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

async function uploadTestimonialImage(file) {
  if (typeof File === "undefined" || !(file instanceof File))
    throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const size = file.size || 0;
  const type = file.type || "";
  if (size > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `testimonials/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return objectPath;
}

function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
  }
}
function getLimitFromReq(req, fallback = 12) {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit"));
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.trunc(n) : fallback;
  } catch {
    return fallback;
  }
}
function getCategoryFilterFromReq(req) {
  try {
    const url = new URL(req.url);
    const category_id = url.searchParams.get("category_id") || undefined;
    const category_slug =
      url.searchParams.get("category_slug") ||
      url.searchParams.get("category") ||
      undefined;
    return { category_id, category_slug };
  } catch {
    return {};
  }
}
function parseFields(req) {
  try {
    const url = new URL(req.url);
    const s = (url.searchParams.get("fields") || "").toLowerCase();
    return new Set(
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}
function trimOrNull(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
function parseStar(input) {
  if (input === null || input === undefined || input === "") return null;
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

/* ===================== GET (list) ===================== */
export async function GET(req) {
  try {
    const locale = getLocaleFromReq(req);
    const limit = getLimitFromReq(req, 12);
    const { category_id, category_slug } = getCategoryFilterFromReq(req);
    const fields = parseFields(req);

    const allowedMinimal = new Set([
      "image",
      "image_public_url",
      "name",
      "description",
    ]);
    const minimalOnly =
      fields.size > 0 && [...fields].every((f) => allowedMinimal.has(f));

    let categoryIdForFilter = category_id;
    if (!categoryIdForFilter && category_slug) {
      const cat = await prisma.testimonial_categories.findUnique({
        where: { slug: category_slug.toLowerCase() },
        select: { id: true },
      });
      if (!cat) return NextResponse.json({ data: [] });
      categoryIdForFilter = cat.id;
    }

    const rows = await prisma.testimonials.findMany({
      where: {
        deleted_at: null,
        ...(categoryIdForFilter ? { category_id: categoryIdForFilter } : {}),
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: minimalOnly
        ? { id: true, photo_url: true }
        : {
            id: true,
            photo_url: true,
            star: true,
            youtube_url: true,
            kampus_negara_tujuan: true,
            category_id: true,
            created_at: true,
            updated_at: true,
          },
    });

    if (!rows.length) return NextResponse.json({ data: [] });

    const ids = rows.map((r) => r.id);
    const translations = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: { in: ids },
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
      select: {
        id_testimonials: true,
        locale: true,
        name: true,
        message: true,
      },
    });

    const pick = new Map();
    for (const tr of translations) {
      const key = tr.id_testimonials;
      const prev = pick.get(key);
      if (!prev || (prev.locale !== locale && tr.locale === locale)) {
        pick.set(key, tr);
      }
    }

    if (minimalOnly) {
      const data = rows.map((r) => {
        const t = pick.get(r.id);
        const image_public_url = getPublicUrl(r.photo_url);
        return {
          id: r.id,
          // aliases for compatibility
          ...(fields.has("image") ? { image: image_public_url } : {}),
          ...(fields.has("image_public_url") ? { image_public_url } : {}),
          ...(fields.has("name") ? { name: t?.name ?? null } : {}),
          ...(fields.has("description")
            ? { description: t?.message ?? null }
            : {}),
        };
      });
      return NextResponse.json({ data });
    }

    const categoryIds = Array.from(
      new Set(rows.map((r) => r.category_id).filter(Boolean))
    );
    let categoriesById = new Map();
    if (categoryIds.length) {
      const cats = await prisma.testimonial_categories.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, slug: true },
      });
      const catTr = await prisma.testimonial_categories_translate.findMany({
        where: {
          category_id: { in: categoryIds },
          locale: locale === "id" ? "id" : { in: [locale, "id"] },
        },
        select: { category_id: true, locale: true, name: true },
      });
      const pickName = new Map();
      for (const t of catTr) {
        const key = t.category_id;
        if (
          !pickName.has(key) ||
          (pickName.get(key).locale !== locale && t.locale === locale)
        ) {
          pickName.set(key, t);
        }
      }
      for (const c of cats) {
        categoriesById.set(c.id, {
          id: c.id,
          slug: c.slug,
          name: pickName.get(c.id)?.name ?? null,
        });
      }
    }

    const data = rows.map((r) => {
      const t = pick.get(r.id);
      const cat =
        r.category_id && categoriesById.size
          ? categoriesById.get(r.category_id) || null
          : null;
      const image_public_url = getPublicUrl(r.photo_url);
      return {
        id: r.id,
        photo_url: r.photo_url,
        // keep old key + add new canonical key
        photo_public_url: image_public_url,
        image_public_url,
        star: r.star ?? null,
        youtube_url: r.youtube_url ?? null,
        kampus_negara_tujuan: r.kampus_negara_tujuan ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        name: t?.name ?? null,
        message: t?.message ?? null,
        locale: t?.locale ?? null,
        category: cat,
      };
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ===================== POST (create) ===================== */
export async function POST(req) {
  try {
    const admin = await assertAdmin();

    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    const isMultipart = contentType.startsWith("multipart/form-data");
    const isUrlEncoded = contentType.startsWith(
      "application/x-www-form-urlencoded"
    );

    const entries = [];
    let inputWasArray = false;

    if (isMultipart || isUrlEncoded) {
      let form;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json(
          {
            message:
              "Body form-data tidak valid. Di Postman pilih Body=form-data dan jangan set Content-Type manual.",
          },
          { status: 400 }
        );
      }

      // dukung file di "file" ATAU "photo_url" (kalau berupa File)
      let file = form.get("file");
      const maybeFileInPhotoUrl = form.get("photo_url");
      if (
        !file &&
        typeof File !== "undefined" &&
        maybeFileInPhotoUrl instanceof File
      ) {
        file = maybeFileInPhotoUrl;
      }

      const body = {};
      for (const [k, v] of form.entries()) {
        if (v instanceof File) continue;
        body[k] = v;
      }
      entries.push({ body, file: file ?? null });
    } else {
      const raw = await req.json().catch(() => ({}));
      inputWasArray = Array.isArray(raw);
      const arr = inputWasArray ? raw : [raw];
      for (const item of arr) entries.push({ body: item ?? {}, file: null });
    }

    if (!entries.length) {
      return NextResponse.json(
        { message: "Payload tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Validasi dasar
    for (let i = 0; i < entries.length; i++) {
      const { body, file } = entries[i];
      const photoUrl = trimOrNull(body.photo_url, 255);
      const name = trimOrNull(body.name, MAX_NAME_LENGTH) || "";
      const message = trimOrNull(body.message, MAX_TEXT_LENGTH) || "";
      const hasUpload = typeof File !== "undefined" && file instanceof File;
      if ((!photoUrl && !hasUpload) || !name || !message) {
        return NextResponse.json(
          {
            message: `photo (file atau photo_url), name, dan message wajib diisi (item index ${i})`,
          },
          { status: 400 }
        );
      }
      if (body.star !== undefined && parseStar(body.star) === null) {
        return NextResponse.json(
          { message: `star harus integer 1-5 (item index ${i})` },
          { status: 422 }
        );
      }
    }

    const results = [];

    for (const { body, file } of entries) {
      const locale = (body.locale || "id").slice(0, 5).toLowerCase();
      const name = trimOrNull(body.name, MAX_NAME_LENGTH) || "";
      const message = trimOrNull(body.message, MAX_TEXT_LENGTH) || "";
      const youtube_url = normalizeYoutubeUrl(body.youtube_url);
      const kampus_negara_tujuan = trimOrNull(
        body.kampus_negara_tujuan ?? body.campusCountry,
        255
      );
      const star = parseStar(body.star);

      let categoryId;
      try {
        categoryId = await resolveCategoryId({
          category_id: body.category_id,
          category_slug: body.category_slug,
        });
      } catch (err) {
        if (err?.message === "CATEGORY_NOT_FOUND") {
          return NextResponse.json(
            { message: "Kategori tidak ditemukan" },
            { status: 422 }
          );
        }
        throw err;
      }

      let storedPhotoPath = trimOrNull(body.photo_url, 255);
      if (file && typeof File !== "undefined" && file instanceof File) {
        try {
          storedPhotoPath = await uploadTestimonialImage(file);
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
      }

      const id = randomUUID();

      await prisma.testimonials.create({
        data: {
          id,
          admin_user_id: admin.id,
          photo_url: storedPhotoPath,
          star,
          youtube_url,
          kampus_negara_tujuan: kampus_negara_tujuan ?? null,
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
        },
      });

      await prisma.testimonials_translate.create({
        data: { id_testimonials: id, locale, name, message },
      });

      if (locale !== "en") {
        const [nameEn, messageEn] = await Promise.all([
          translate(name, locale || "id", "en"),
          translate(message, locale || "id", "en"),
        ]);
        await prisma.testimonials_translate.create({
          data: {
            id_testimonials: id,
            locale: "en",
            name: (nameEn || name).slice(0, MAX_NAME_LENGTH),
            message: messageEn || message,
          },
        });
      }

      const image_public_url = getPublicUrl(storedPhotoPath);

      results.push({
        id,
        photo_url: storedPhotoPath,
        // keep old + add new canonical key
        photo_public_url: image_public_url,
        image_public_url,
        star: star ?? null,
        youtube_url: youtube_url ?? null,
        kampus_negara_tujuan: kampus_negara_tujuan ?? null,
        locale,
        name,
        message,
        category_id: categoryId ?? null,
      });
    }

    const payload = inputWasArray ? results : results[0];
    return NextResponse.json({ data: payload }, { status: 201 });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("POST /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
