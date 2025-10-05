// app/api/programs/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
const PROGRAM_TYPE_VALUES = new Set(["B2B", "B2C"]);
const PROGRAM_CATEGORY_VALUES = new Set([
  "STUDY_ABROAD",
  "WORK_ABROAD",
  "LANGUAGE_COURSE",
  "CONSULTANT_VISA",
]);

function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
function pickTrans(trans, primary, fallback) {
  const by = (loc) => trans?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function ensureProgramTypeOptional(v) {
  if (v === undefined) return undefined;
  const val = String(v || "")
    .trim()
    .toUpperCase();
  if (!PROGRAM_TYPE_VALUES.has(val)) {
    throw new Error("program_type harus 'B2B' atau 'B2C'");
  }
  return val;
}
function ensureProgramCategoryOptional(v) {
  if (v === undefined) return undefined; // tidak dikirim
  if (v === null || v === "") return null; // clear
  const val = String(v).trim().toUpperCase();
  if (!PROGRAM_CATEGORY_VALUES.has(val)) {
    throw new Error(
      "program_category tidak valid (STUDY_ABROAD|WORK_ABROAD|LANGUAGE_COURSE|CONSULTANT_VISA)"
    );
  }
  return val;
}

// ===== Supabase helpers (selaras dengan /api/programs) =====
const BUCKET = process.env.SUPABASE_BUCKET;
function isHttpUrl(path) {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}
function getPublicUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  if (!BUCKET) return path;
  const { data, error } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (error) {
    console.error("supabase getPublicUrl error:", error);
    return null;
  }
  return data?.publicUrl || null;
}

async function uploadProgramImage(file) {
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
  const objectPath = `programs/${new Date()
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

/* ========= GET /api/programs/:id (DETAIL) ========= */
// Query: locale=xx&fallback=id
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get("locale") || "id").toLowerCase();
    const fallback = (searchParams.get("fallback") || "id").toLowerCase();

    const item = await prisma.programs.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        admin_user_id: true,
        image_url: true,
        program_type: true,
        program_category: true,
        price: true,
        phone: true,
        is_published: true,
        created_at: true,
        updated_at: true,
        programs_translate: {
          where: { locale: { in: [locale, fallback] } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!item) return notFound();

    const t = pickTrans(item.programs_translate, locale, fallback);
    const image_public_url = getPublicUrl(item.image_url);

    const data = {
      id: item.id,
      admin_user_id: item.admin_user_id,
      image_url: item.image_url,
      image_public_url,
      program_type: item.program_type,
      program_category: item.program_category,
      price: item.price,
      phone: item.phone,
      is_published: item.is_published,
      created_at: item.created_at,
      updated_at: item.updated_at,
      locale_used: t?.locale || null,
      name: t?.name || null,
      description: t?.description || null,
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error(`GET /api/programs/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch program" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/programs/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const contentType = req.headers.get("content-type") || "";

    // values that may come from either JSON or form-data
    let payload = {};
    let uploadFile = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      // file (optional)
      uploadFile = form.get("file") || null;

      // optional primitive fields
      const toStr = (k) => (form.has(k) ? String(form.get(k)) : undefined);

      payload.image_url = form.has("image_url")
        ? toStr("image_url") || null
        : undefined;

      payload.program_type = toStr("program_type");
      payload.program_category = toStr("program_category");
      payload.phone = toStr("phone");

      if (form.has("price")) {
        const v = toStr("price");
        payload.price =
          v === undefined || v === null || v === "" ? null : parseInt(v, 10);
      }

      if (form.has("is_published")) {
        const v = (toStr("is_published") || "").toLowerCase();
        payload.is_published = v === "true" || v === "1";
      }

      // translations
      if (form.has("name_id")) payload.name_id = toStr("name_id");
      if (form.has("description_id"))
        payload.description_id = form.get("description_id") ?? null;

      if (form.has("name_en")) payload.name_en = toStr("name_en");
      if (form.has("description_en"))
        payload.description_en = form.get("description_en") ?? null;

      if (form.has("autoTranslate")) {
        payload.autoTranslate =
          (toStr("autoTranslate") || "true").toLowerCase() !== "false";
      }
    } else {
      // JSON
      payload = await req.json().catch(() => ({}));
    }

    // Build update data
    const data = {};

    // Handle image upload first (if any)
    let storedImagePath = undefined; // undefined => don't touch; null => clear; string => set
    if (uploadFile) {
      try {
        const objectPath = await uploadProgramImage(uploadFile);
        storedImagePath = objectPath;
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
        console.error("uploadProgramImage error:", e);
        return NextResponse.json(
          { message: "Upload gambar gagal" },
          { status: 500 }
        );
      }
    } else if (payload.image_url !== undefined) {
      // client sent explicit image_url change (string or null/"")
      storedImagePath =
        payload.image_url === null || payload.image_url === ""
          ? null
          : String(payload.image_url);
    }

    if (storedImagePath !== undefined) {
      data.image_url = storedImagePath; // may be string or null
    }

    if (payload.program_type !== undefined) {
      try {
        data.program_type = ensureProgramTypeOptional(payload.program_type);
      } catch (e) {
        return badRequest(e.message);
      }
    }

    if (payload.program_category !== undefined) {
      try {
        data.program_category = ensureProgramCategoryOptional(
          payload.program_category
        );
      } catch (e) {
        return badRequest(e.message);
      }
    }

    if (payload.price !== undefined) {
      const p =
        payload.price === null || payload.price === undefined
          ? null
          : parseInt(payload.price, 10);
      if (p !== null && (!Number.isFinite(p) || p < 0))
        return badRequest("price harus bilangan bulat >= 0");
      data.price = p;
    }

    if (payload.phone !== undefined) data.phone = payload.phone ?? null;
    if (payload.is_published !== undefined)
      data.is_published = !!payload.is_published;
    if (Object.keys(data).length) data.updated_at = new Date();

    const updated = Object.keys(data).length
      ? await prisma.programs.update({ where: { id }, data })
      : await prisma.programs.findUnique({ where: { id } });

    if (!updated) return notFound();

    // Upsert translations if provided
    const ops = [];

    if (payload.name_id !== undefined || payload.description_id !== undefined) {
      ops.push(
        prisma.programs_translate.upsert({
          where: { id_programs_locale: { id_programs: id, locale: "id" } },
          update: {
            ...(payload.name_id !== undefined
              ? { name: String(payload.name_id).slice(0, 191) }
              : {}),
            ...(payload.description_id !== undefined
              ? { description: payload.description_id ?? null }
              : {}),
          },
          create: {
            id_programs: id,
            locale: "id",
            name: String(payload.name_id ?? "(no title)").slice(0, 191),
            description: payload.description_id ?? null,
          },
        })
      );
    }

    if (payload.name_en !== undefined || payload.description_en !== undefined) {
      ops.push(
        prisma.programs_translate.upsert({
          where: { id_programs_locale: { id_programs: id, locale: "en" } },
          update: {
            ...(payload.name_en !== undefined
              ? { name: String(payload.name_en).slice(0, 191) }
              : {}),
            ...(payload.description_en !== undefined
              ? { description: payload.description_en ?? null }
              : {}),
          },
          create: {
            id_programs: id,
            locale: "en",
            name: String(payload.name_en ?? "(no title)").slice(0, 191),
            description: payload.description_en ?? null,
          },
        })
      );
    }

    if (payload.autoTranslate && (payload.name_id || payload.description_id)) {
      const name_en =
        payload.name_id !== undefined && payload.name_id !== null
          ? await translate(String(payload.name_id), "id", "en")
          : undefined;
      const desc_en =
        payload.description_id !== undefined
          ? await translate(String(payload.description_id), "id", "en")
          : undefined;

      ops.push(
        prisma.programs_translate.upsert({
          where: { id_programs_locale: { id_programs: id, locale: "en" } },
          update: {
            ...(name_en ? { name: name_en.slice(0, 191) } : {}),
            ...(desc_en !== undefined ? { description: desc_en ?? null } : {}),
          },
          create: {
            id_programs: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en ?? null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    const finalImagePath =
      storedImagePath !== undefined ? storedImagePath : updated.image_url;
    const image_public_url = getPublicUrl(finalImagePath);

    return NextResponse.json({
      data: {
        id,
        image_url: finalImagePath,
        image_public_url,
      },
    });
  } catch (e) {
    console.error(`PATCH /api/programs/${params?.id} error:`, e);
    if (e.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to update program" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/programs/:id (SOFT DELETE) ========= */
export async function DELETE(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const deleted = await prisma.programs.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_published: false,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ data: deleted });
  } catch (e) {
    console.error(`DELETE /api/programs/${params?.id} error:`, e);
    if (e.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to delete program" },
      { status: 500 }
    );
  }
}
