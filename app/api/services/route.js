import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===================== Auth & Helpers ===================== */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

const SERVICE_TYPE_VALUES = new Set(["B2B", "B2C"]);
const MAX_NAME_LENGTH = 191;
const MAX_TEXT_LENGTH = 10000;
const BUCKET = process.env.SUPABASE_BUCKET;

function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "y" || s === "yes";
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "price"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
  }
}
function getFallbackFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("fallback") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
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
function pickTrans(trans, primary, fallback) {
  const by = (loc) => trans?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function ensureServiceType(v) {
  const val = String(v || "")
    .trim()
    .toUpperCase();
  if (!SERVICE_TYPE_VALUES.has(val)) {
    throw new Error("service_type harus 'B2B' atau 'B2C'");
  }
  return val;
}
function normalizeSlug(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---- Supabase public URL helper (no network call) ---- */
function publicUrlFromPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already url
  try {
    if (!BUCKET || !supabaseAdmin?.storage) return null;
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

/* ---- Supabase upload helper ---- */
async function uploadServiceImage(file) {
  if (typeof File === "undefined" || !(file instanceof File)) {
    throw new Error("NO_FILE");
  }
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
  const objectPath = `services/${new Date()
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

/* ---- Category resolver (POST) — per-field semantics ---- */
async function resolveCategoryId({ category_id, category_slug }) {
  // If `category_id` is provided (even empty/null), handle it and return immediately.
  if (category_id !== undefined) {
    if (category_id === null || category_id === "") return null; // explicit clear
    if (typeof category_id === "string" && category_id.trim()) {
      const found = await prisma.service_categories.findUnique({
        where: { id: category_id.trim() },
        select: { id: true },
      });
      if (!found) throw new Error("CATEGORY_NOT_FOUND");
      return found.id;
    }
    return undefined; // unrecognized form
  }

  // Else, if `category_slug` is provided, handle it.
  if (category_slug !== undefined) {
    if (category_slug === null || category_slug === "") return null; // explicit clear
    if (typeof category_slug === "string" && category_slug.trim()) {
      const slug = normalizeSlug(category_slug);
      const found = await prisma.service_categories.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!found) throw new Error("CATEGORY_NOT_FOUND");
      return found.id;
    }
    return undefined;
  }

  // Neither provided
  return undefined;
}

/* ===================== GET (list/single) ===================== */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // optional single-item via ?id=
    const idParam = searchParams.get("id");
    if (idParam) {
      const locale = getLocaleFromReq(req);
      const fallback = getFallbackFromReq(req);

      const item = await prisma.services.findFirst({
        where: { id: idParam, deleted_at: null },
        select: {
          id: true,
          admin_user_id: true,
          image_url: true,
          service_type: true,
          category_id: true,
          price: true,
          phone: true,
          is_published: true,
          created_at: true,
          updated_at: true,
          category: { select: { id: true, slug: true, name: true } },
          services_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: { locale: true, name: true, description: true },
          },
        },
      });

      if (!item)
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      const t = pickTrans(item.services_translate, locale, fallback);

      return NextResponse.json({
        data: {
          id: item.id,
          admin_user_id: item.admin_user_id,
          image_url: item.image_url,
          image_public_url: publicUrlFromPath(item.image_url),
          service_type: item.service_type,
          category: item.category
            ? {
                id: item.category.id,
                slug: item.category.slug,
                name: item.category.name,
              }
            : null,
          price: item.price,
          phone: item.phone,
          is_published: item.is_published,
          created_at: item.created_at,
          updated_at: item.updated_at,
          locale_used: t?.locale || null,
          name: t?.name || null,
          description: t?.description || null,
        },
      });
    }

    // ===== list =====
    const q = searchParams.get("q")?.trim();
    const service_type = searchParams.get("service_type") || undefined;
    const published = parseBool(searchParams.get("published"));
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const category_id = searchParams.get("category_id") || undefined;
    const category_slug = searchParams.get("category_slug") || undefined;

    const locale = getLocaleFromReq(req);
    const fallback = getFallbackFromReq(req);
    const fields = parseFields(req);
    const allowedMinimal = new Set([
      "image",
      "image_public",
      "image_public_url",
      "name",
      "description",
    ]);
    const minimalOnly =
      fields.size > 0 && [...fields].every((f) => allowedMinimal.has(f));

    let typeFilter;
    if (service_type && SERVICE_TYPE_VALUES.has(service_type.toUpperCase())) {
      typeFilter = service_type.toUpperCase();
    }

    // strict filter by related category.slug (normalized)
    const normalizedSlug =
      category_slug && !category_id ? normalizeSlug(category_slug) : null;

    const where = {
      deleted_at: null,
      ...(typeFilter ? { service_type: typeFilter } : {}),
      ...(published !== undefined ? { is_published: published } : {}),
      ...(category_id ? { category_id } : {}),
      ...(normalizedSlug ? { category: { is: { slug: normalizedSlug } } } : {}),
      ...(q
        ? {
            services_translate: {
              some: {
                locale: { in: [locale, fallback] },
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    // === total global & totalPages
    const total = await prisma.services.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const rows = await prisma.services.findMany({
      where,
      orderBy,
      take: perPage,
      skip: (page - 1) * perPage,
      select: minimalOnly
        ? {
            id: true,
            image_url: true,
            updated_at: true,
            services_translate: {
              where: { locale: { in: [locale, fallback] } },
              select: { locale: true, name: true, description: true },
            },
          }
        : {
            id: true,
            admin_user_id: true,
            image_url: true,
            service_type: true,
            category_id: true,
            price: true,
            phone: true,
            is_published: true,
            created_at: true,
            updated_at: true,
            category: { select: { id: true, slug: true, name: true } },
            services_translate: {
              where: { locale: { in: [locale, fallback] } },
              select: { locale: true, name: true, description: true },
            },
          },
    });

    const meta = { page, perPage, total, totalPages };

    if (minimalOnly) {
      const data = rows.map((s) => {
        const t = pickTrans(s.services_translate, locale, fallback);
        const image_public_url = publicUrlFromPath(s.image_url);
        return {
          id: s.id,
          ...(fields.has("image") ? { image: s.image_url } : {}),
          ...(fields.has("image_public") || fields.has("image_public_url")
            ? { image_public_url }
            : {}),
          ...(fields.has("name") ? { name: t?.name ?? null } : {}),
          ...(fields.has("description")
            ? { description: t?.description ?? null }
            : {}),
        };
      });
      return NextResponse.json({ data, meta });
    }

    const data = rows.map((s) => {
      const t = pickTrans(s.services_translate, locale, fallback);
      return {
        id: s.id,
        admin_user_id: s.admin_user_id,
        image_url: s.image_url,
        image_public_url: publicUrlFromPath(s.image_url),
        service_type: s.service_type,
        category: s.category
          ? { id: s.category.id, slug: s.category.slug, name: s.category.name }
          : null,
        price: s.price,
        phone: s.phone,
        is_published: s.is_published,
        created_at: s.created_at,
        updated_at: s.updated_at,
        locale_used: t?.locale || null,
        name: t?.name || null,
        description: t?.description || null,
      };
    });

    return NextResponse.json({ data, meta });
  } catch (err) {
    console.error("GET /api/services error:", err);
    return NextResponse.json(
      { message: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

/* ===================== POST (create + auto-translate) ===================== */
export async function POST(req) {
  try {
    const admin = await assertAdmin(); // <-- FIX: keep object (no await later)

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

      let file = form.get("file");
      const maybeFileInImage = form.get("image_url");
      if (
        !file &&
        typeof File !== "undefined" &&
        maybeFileInImage instanceof File
      ) {
        file = maybeFileInImage;
      }

      const body = {};
      for (const [k, v] of form.entries()) {
        if (v instanceof File) continue;
        body[k] = v;
      }
      entries.push({ body, file: file ?? null });
    } else {
      const raw = (await req.json().catch(() => ({}))) ?? {};
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

    const results = [];

    for (let i = 0; i < entries.length; i++) {
      const { body, file } = entries[i];

      const name_id = (body.name_id ?? body.name ?? "")
        .toString()
        .trim()
        .slice(0, MAX_NAME_LENGTH);
      if (!name_id) {
        return NextResponse.json(
          {
            message: `name_id (Bahasa Indonesia) wajib diisi (item index ${i})`,
          },
          { status: 400 }
        );
      }
      const descRaw =
        body.description_id !== undefined
          ? body.description_id
          : body.description !== undefined
          ? body.description
          : null;
      const description_id =
        descRaw === null || descRaw === undefined
          ? null
          : String(descRaw).slice(0, MAX_TEXT_LENGTH);

      let name_en = (body.name_en || "")
        .toString()
        .trim()
        .slice(0, MAX_NAME_LENGTH);
      let description_en =
        body.description_en === null || body.description_en === undefined
          ? ""
          : String(body.description_en).slice(0, MAX_TEXT_LENGTH);
      const autoTranslate =
        String(body.autoTranslate ?? "true").toLowerCase() !== "false";

      let service_type;
      try {
        service_type = ensureServiceType(body.service_type);
      } catch (e) {
        return NextResponse.json({ message: e.message }, { status: 400 });
      }

      const price =
        body.price === null || body.price === undefined || body.price === ""
          ? null
          : asInt(body.price, NaN);
      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        return NextResponse.json(
          { message: "price harus bilangan bulat >= 0" },
          { status: 422 }
        );
      }

      const phone =
        body.phone === null || body.phone === undefined
          ? null
          : String(body.phone).trim() || null;
      const publishFlag = parseBool(body.is_published);
      const is_published = publishFlag === undefined ? false : !!publishFlag;

      let category_id_resolved = undefined;
      try {
        category_id_resolved = await resolveCategoryId({
          category_id: body.category_id,
          category_slug: body.category_slug,
        });
      } catch (e) {
        if (e?.message === "CATEGORY_NOT_FOUND") {
          return NextResponse.json(
            { message: "Kategori tidak ditemukan" },
            { status: 422 }
          );
        }
        throw e;
      }

      // image (file atau path)
      let storedImagePath = (body.image_url || "").toString().trim();
      if (file && typeof File !== "undefined" && file instanceof File) {
        try {
          storedImagePath = await uploadServiceImage(file);
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
          console.error("uploadServiceImage error:", e);
          return NextResponse.json(
            { message: "Upload gambar gagal" },
            { status: 500 }
          );
        }
      }
      const image_url =
        storedImagePath && storedImagePath.trim()
          ? storedImagePath.trim()
          : null;

      // auto translate
      if (autoTranslate) {
        if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
        if (!description_en && description_id)
          description_en = await translate(description_id, "id", "en");
      }

      const id = randomUUID();

      await prisma.services.create({
        data: {
          id,
          admin_user_id: admin.id, // <-- FIX here
          image_url,
          service_type,
          ...(category_id_resolved !== undefined
            ? { category_id: category_id_resolved }
            : {}),
          price,
          phone,
          is_published,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });

      await prisma.services_translate.create({
        data: {
          id_services: id,
          locale: "id",
          name: name_id.slice(0, MAX_NAME_LENGTH),
          description: description_id ?? null,
        },
      });

      if (name_en || description_en) {
        await prisma.services_translate.create({
          data: {
            id_services: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, MAX_NAME_LENGTH),
            description: description_en || null,
          },
        });
      }

      results.push({
        id,
        image_url,
        image_public_url: publicUrlFromPath(image_url),
        service_type,
        category_id: category_id_resolved ?? null,
        price,
        phone,
        is_published,
        name_id,
        description_id: description_id ?? null,
        name_en: name_en || null,
        description_en: description_en || null,
      });
    }

    const payload = inputWasArray ? results : results[0];
    return NextResponse.json({ data: payload }, { status: 201 });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("POST /api/services error:", e);
    return NextResponse.json(
      { message: "Failed to create service" },
      { status: 500 }
    );
  }
}
