// app/api/programs/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

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
    const data = {
      id: item.id,
      admin_user_id: item.admin_user_id,
      image_url: item.image_url,
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

/* ========= PUT/PATCH /api/programs/:id (UPDATE + upsert translations) ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const body = await req.json();

    const data = {};

    if (body.image_url !== undefined) data.image_url = body.image_url ?? null;

    // NEW: program_type (B2B/B2C)
    if (body.program_type !== undefined) {
      try {
        data.program_type = ensureProgramTypeOptional(body.program_type);
      } catch (e) {
        return badRequest(e.message);
      }
    }

    // NEW: program_category (4 kategori) — bisa null untuk clear
    if (body.program_category !== undefined) {
      try {
        data.program_category = ensureProgramCategoryOptional(
          body.program_category
        );
      } catch (e) {
        return badRequest(e.message);
      }
    }

    if (body.price !== undefined) {
      const p =
        body.price === null || body.price === undefined
          ? null
          : parseInt(body.price, 10);
      if (p !== null && (!Number.isFinite(p) || p < 0))
        return badRequest("price harus bilangan bulat >= 0");
      data.price = p;
    }

    if (body.phone !== undefined) data.phone = body.phone ?? null;
    if (body.is_published !== undefined)
      data.is_published = !!body.is_published;
    if (Object.keys(data).length) data.updated_at = new Date();

    const updated = Object.keys(data).length
      ? await prisma.programs.update({ where: { id }, data })
      : await prisma.programs.findUnique({ where: { id } });

    if (!updated) return notFound();

    const ops = [];

    if (body.name_id !== undefined || body.description_id !== undefined) {
      ops.push(
        prisma.programs_translate.upsert({
          where: { id_programs_locale: { id_programs: id, locale: "id" } },
          update: {
            ...(body.name_id !== undefined
              ? { name: String(body.name_id).slice(0, 191) }
              : {}),
            ...(body.description_id !== undefined
              ? { description: body.description_id ?? null }
              : {}),
          },
          create: {
            id_programs: id,
            locale: "id",
            name: String(body.name_id ?? "(no title)").slice(0, 191),
            description: body.description_id ?? null,
          },
        })
      );
    }

    if (body.name_en !== undefined || body.description_en !== undefined) {
      ops.push(
        prisma.programs_translate.upsert({
          where: { id_programs_locale: { id_programs: id, locale: "en" } },
          update: {
            ...(body.name_en !== undefined
              ? { name: String(body.name_en).slice(0, 191) }
              : {}),
            ...(body.description_en !== undefined
              ? { description: body.description_en ?? null }
              : {}),
          },
          create: {
            id_programs: id,
            locale: "en",
            name: String(body.name_en ?? "(no title)").slice(0, 191),
            description: body.description_en ?? null,
          },
        })
      );
    }

    if (body.autoTranslate && (body.name_id || body.description_id)) {
      const name_en = body.name_id
        ? await translate(String(body.name_id), "id", "en")
        : undefined;
      const desc_en = body.description_id
        ? await translate(String(body.description_id), "id", "en")
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

    return NextResponse.json({ data: { id } });
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
