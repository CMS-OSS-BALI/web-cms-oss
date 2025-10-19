// app/api/services/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =============== Auth & Helpers =============== */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

const SERVICE_TYPE_VALUES = new Set(["B2B", "B2C"]);
const BUCKET = process.env.SUPABASE_BUCKET;

function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
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
function ensureServiceTypeOptional(v) {
  if (v === undefined) return undefined;
  const val = String(v || "")
    .trim()
    .toUpperCase();
  if (!SERVICE_TYPE_VALUES.has(val)) {
    throw new Error("service_type harus 'B2B' atau 'B2C'");
  }
  return val;
}
function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "y" || s === "yes";
}

/* ---- Supabase public URL helper ---- */
function publicUrlFromPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
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

/* ---- Category resolver ---- */
async function resolveCategoryId({ category_id, category_slug }) {
  if (category_id === undefined && category_slug === undefined)
    return undefined;
  if (category_id === null || category_id === "") return null;
  if (category_slug === null || category_slug === "") return null;

  if (typeof category_id === "string" && category_id.trim()) {
    const found = await prisma.service_categories.findUnique({
      where: { id: category_id.trim() },
      select: { id: true },
    });
    if (!found) throw new Error("CATEGORY_NOT_FOUND");
    return found.id;
  }
  if (typeof category_slug === "string" && category_slug.trim()) {
    const found = await prisma.service_categories.findUnique({
      where: { slug: category_slug.trim().toLowerCase() },
      select: { id: true },
    });
    if (!found) throw new Error("CATEGORY_NOT_FOUND");
    return found.id;
  }
  return undefined;
}

/* ========= GET /api/services/:id (DETAIL) ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = getLocaleFromReq(req);
    const fallback = getFallbackFromReq(req);

    const item = await prisma.services.findFirst({
      where: { id, deleted_at: null },
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
    if (!item) return notFound();

    const t = ((arr) => {
      const by = (loc) => arr?.find((x) => x.locale === loc);
      return by(locale) || by(fallback) || null;
    })(item.services_translate);

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
  } catch (err) {
    console.error(`GET /api/services/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/services/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

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
      const maybeFile = form.get("image_url");
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

    const base = await prisma.services.findUnique({ where: { id } });
    if (!base || base.deleted_at) return notFound();

    const data = {};

    // image
    if (
      uploadFile &&
      typeof File !== "undefined" &&
      uploadFile instanceof File
    ) {
      try {
        data.image_url = await uploadServiceImage(uploadFile);
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
    } else if (body.image_url !== undefined) {
      const trimmed = String(body.image_url || "").trim();
      data.image_url = trimmed === "" ? null : trimmed;
    }

    // service_type
    if (body.service_type !== undefined) {
      try {
        data.service_type = ensureServiceTypeOptional(body.service_type);
      } catch (e) {
        return badRequest(e.message);
      }
    }

    // category
    if (body.category_id !== undefined || body.category_slug !== undefined) {
      let category_id;
      try {
        category_id = await resolveCategoryId({
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
      if (category_id !== undefined) data.category_id = category_id; // null to clear, or id
    }

    // price
    if (body.price !== undefined) {
      const p =
        body.price === null || body.price === undefined || body.price === ""
          ? null
          : parseInt(body.price, 10);
      if (p !== null && (!Number.isFinite(p) || p < 0))
        return badRequest("price harus bilangan bulat >= 0");
      data.price = p;
    }

    // phone
    if (body.phone !== undefined)
      data.phone = body.phone === null ? null : String(body.phone);

    // publish
    if (body.is_published !== undefined) {
      const publishFlag = parseBool(body.is_published);
      data.is_published =
        publishFlag === undefined ? base.is_published : !!publishFlag;
    }

    if (Object.keys(data).length) data.updated_at = new Date();
    if (Object.keys(data).length)
      await prisma.services.update({ where: { id }, data });

    // Translations upsert
    const ops = [];

    if (body.name_id !== undefined || body.description_id !== undefined) {
      ops.push(
        prisma.services_translate.upsert({
          where: { id_services_locale: { id_services: id, locale: "id" } },
          update: {
            ...(body.name_id !== undefined
              ? { name: String(body.name_id).slice(0, 191) }
              : {}),
            ...(body.description_id !== undefined
              ? { description: body.description_id ?? null }
              : {}),
          },
          create: {
            id_services: id,
            locale: "id",
            name: String(body.name_id ?? "(no title)").slice(0, 191),
            description: body.description_id ?? null,
          },
        })
      );
    }

    if (body.name_en !== undefined || body.description_en !== undefined) {
      ops.push(
        prisma.services_translate.upsert({
          where: { id_services_locale: { id_services: id, locale: "en" } },
          update: {
            ...(body.name_en !== undefined
              ? { name: String(body.name_en).slice(0, 191) }
              : {}),
            ...(body.description_en !== undefined
              ? { description: body.description_en ?? null }
              : {}),
          },
          create: {
            id_services: id,
            locale: "en",
            name: String(body.name_en ?? "(no title)").slice(0, 191),
            description: body.description_en ?? null,
          },
        })
      );
    }

    if (String(body.autoTranslate ?? "false").toLowerCase() === "true") {
      if (body.name_id !== undefined || body.description_id !== undefined) {
        const name_en =
          body.name_id !== undefined && body.name_id !== null
            ? await translate(String(body.name_id), "id", "en")
            : undefined;
        const desc_en =
          body.description_id !== undefined
            ? await translate(String(body.description_id), "id", "en")
            : undefined;

        ops.push(
          prisma.services_translate.upsert({
            where: { id_services_locale: { id_services: id, locale: "en" } },
            update: {
              ...(name_en ? { name: name_en.slice(0, 191) } : {}),
              ...(desc_en !== undefined
                ? { description: desc_en ?? null }
                : {}),
            },
            create: {
              id_services: id,
              locale: "en",
              name: (name_en || "(no title)").slice(0, 191),
              description: desc_en ?? null,
            },
          })
        );
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    const latest = await prisma.services.findUnique({
      where: { id },
      select: {
        id: true,
        image_url: true,
        service_type: true,
        category_id: true,
        price: true,
        phone: true,
        is_published: true,
      },
    });
    if (!latest) return notFound();

    const trs = await prisma.services_translate.findMany({
      where: { id_services: id, locale: { in: ["id", "en"] } },
      select: { locale: true, name: true, description: true },
    });

    let name_id = null,
      description_id = null,
      name_en = null,
      description_en = null;
    for (const t of trs) {
      if (t.locale === "id") {
        name_id = t.name ?? null;
        description_id = t.description ?? null;
      } else if (t.locale === "en") {
        name_en = t.name ?? null;
        description_en = t.description ?? null;
      }
    }

    return NextResponse.json({
      data: {
        id,
        image_url: latest.image_url ?? null,
        image_public_url: publicUrlFromPath(latest.image_url ?? null),
        service_type: latest.service_type ?? null,
        category_id: latest.category_id ?? null,
        price: latest.price ?? null,
        phone: latest.phone ?? null,
        is_published: latest.is_published ?? false,
        name_id,
        description_id,
        name_en,
        description_en,
      },
    });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(`PATCH /api/services/${params?.id} error:`, e);
    if (e.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to update service" },
      { status: 500 }
    );
  }
}

/* ========= DELETE ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id)
      return NextResponse.json(
        { message: "id wajib disertakan" },
        { status: 400 }
      );

    const existing = await prisma.services.findUnique({
      where: { id },
      select: { id: true, image_url: true },
    });
    if (!existing)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.services_translate.deleteMany({ where: { id_services: id } }),
      prisma.services.delete({ where: { id } }),
    ]);

    try {
      const path = existing.image_url || "";
      if (
        path &&
        !/^https?:\/\//i.test(path) &&
        supabaseAdmin?.storage &&
        process.env.SUPABASE_BUCKET
      ) {
        await supabaseAdmin.storage
          .from(process.env.SUPABASE_BUCKET)
          .remove([path]);
      }
    } catch (err) {
      console.warn("Supabase remove image failed:", err?.message || err);
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (e?.code === "P2025")
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (e?.code === "P2003")
      return NextResponse.json(
        { message: "Delete blocked by foreign key constraints" },
        { status: 409 }
      );
    console.error(`DELETE /api/services/${params?.id} error:`, e);
    return NextResponse.json(
      { message: "Failed to delete service" },
      { status: 500 }
    );
  }
}
