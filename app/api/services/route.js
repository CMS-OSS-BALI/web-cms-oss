// app/api/services/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import storageClient from "@/app/utils/storageClient";

/* =========================
   Runtime & Defaults
========================= */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Storage helpers (match consultants)
========================= */
const PUBLIC_PREFIX = "cms-oss";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

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
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  return null;
}
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
  } catch {}
}

/* =========================
   Auth & common helpers
========================= */
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

/* =========================
   Upload helpers
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
async function uploadServiceImage(file, serviceId) {
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/services/${serviceId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/* =========================
   Category resolver (POST)
========================= */
async function resolveCategoryId({ category_id, category_slug }) {
  if (category_id !== undefined) {
    if (category_id === null || category_id === "") return null;
    if (typeof category_id === "string" && category_id.trim()) {
      const found = await prisma.service_categories.findUnique({
        where: { id: category_id.trim() },
        select: { id: true },
      });
      if (!found) throw new Error("CATEGORY_NOT_FOUND");
      return found.id;
    }
    return undefined;
  }

  if (category_slug !== undefined) {
    if (category_slug === null || category_slug === "") return null;
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

  return undefined;
}

/* ===================== GET (list or ?id=) ===================== */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // single via ?id=
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
      const pub = toPublicUrl(item.image_url);
      const ver =
        item.updated_at && pub
          ? `?v=${new Date(item.updated_at).getTime()}`
          : "";
      const resolved = pub ? pub + ver : null;

      return NextResponse.json({
        data: {
          id: item.id,
          admin_user_id: item.admin_user_id,
          image_url: item.image_url,
          image_public_url: pub,
          image_resolved_url: resolved,
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

    // list
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
      "image_public_url",
      "image_public",
      "image_resolved_url",
      "name",
      "description",
    ]);
    const minimalOnly =
      fields.size > 0 && [...fields].every((f) => allowedMinimal.has(f));

    let typeFilter;
    if (service_type && SERVICE_TYPE_VALUES.has(service_type.toUpperCase())) {
      typeFilter = service_type.toUpperCase();
    }
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

    const total = await prisma.services.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const selectMinimal = {
      id: true,
      image_url: true,
      updated_at: true,
      services_translate: {
        where: { locale: { in: [locale, fallback] } },
        select: { locale: true, name: true, description: true },
      },
    };
    const selectFull = {
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
    };

    const rows = await prisma.services.findMany({
      where,
      orderBy,
      take: perPage,
      skip: (page - 1) * perPage,
      select: minimalOnly ? selectMinimal : selectFull,
    });

    const meta = { page, perPage, total, totalPages };

    if (minimalOnly) {
      const data = rows.map((s) => {
        const t = pickTrans(s.services_translate, locale, fallback);
        const pub = toPublicUrl(s.image_url);
        const ver =
          s.updated_at && pub ? `?v=${new Date(s.updated_at).getTime()}` : "";
        const resolved = pub ? pub + ver : null;

        const obj = { id: s.id };
        if (fields.has("image")) obj.image = s.image_url;
        if (fields.has("image_public") || fields.has("image_public_url"))
          obj.image_public_url = pub;
        if (fields.has("image_resolved_url")) obj.image_resolved_url = resolved;
        if (fields.has("name")) obj.name = t?.name ?? null;
        if (fields.has("description")) obj.description = t?.description ?? null;
        return obj;
      });
      return NextResponse.json({ data, meta });
    }

    const data = rows.map((s) => {
      const t = pickTrans(s.services_translate, locale, fallback);
      const pub = toPublicUrl(s.image_url);
      const ver =
        s.updated_at && pub ? `?v=${new Date(s.updated_at).getTime()}` : "";
      const resolved = pub ? pub + ver : null;

      return {
        id: s.id,
        admin_user_id: s.admin_user_id,
        image_url: s.image_url,
        image_public_url: pub,
        image_resolved_url: resolved,
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

      // generate id dulu supaya folder upload rapi
      const id = randomUUID();

      // image (file atau url)
      let storedImage = (body.image_url || "").toString().trim();
      if (file && typeof File !== "undefined" && file instanceof File) {
        try {
          storedImage = await uploadServiceImage(file, id);
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
          console.error("uploadServiceImage error:", e);
          return NextResponse.json(
            { message: "Upload gambar gagal" },
            { status: 500 }
          );
        }
      }
      const image_url = storedImage ? toPublicUrl(storedImage) : null;

      // auto translate
      if (autoTranslate) {
        if (!name_en && name_id) {
          try {
            name_en = await translate(name_id, "id", "en");
          } catch {}
        }
        if (!description_en && description_id) {
          try {
            description_en = await translate(description_id, "id", "en");
          } catch {}
        }
      }

      await prisma.services.create({
        data: {
          id,
          admin_user_id: admin.id,
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

      const pub = toPublicUrl(image_url);
      const resolved = pub ? `${pub}?v=${Date.now()}` : null;

      results.push({
        id,
        image_url,
        image_public_url: pub,
        image_resolved_url: resolved,
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
