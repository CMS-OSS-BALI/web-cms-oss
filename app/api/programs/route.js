// app/api/programs/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  return v === true || v === "true" || v === "1";
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
  // name di tabel utama sudah dihapus; hanya izinkan kolom nyata
  const allowed = new Set(["created_at", "updated_at", "price"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
async function getAdminUserId(req, body) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return req.headers.get("x-admin-user-id") || body?.admin_user_id || null;
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
// helper untuk pilih terjemahan terbaik (locale utama lalu fallback)
function pickTrans(trans, primary, fallback) {
  const by = (loc) => trans?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ========= GET /api/programs  (LIST) ========= */
// Query: q, category, published, page, perPage, sort, locale, fallback (default id)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category") || undefined;
    const published = parseBool(searchParams.get("published"));
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 10))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const locale = (searchParams.get("locale") || "id").toLowerCase();
    const fallback = (searchParams.get("fallback") || "id").toLowerCase();

    // WHERE di tabel utama + filter q di translations untuk locale relevan
    const where = {
      deleted_at: null,
      ...(category ? { program_category: category } : {}),
      ...(published !== undefined ? { is_published: published } : {}),
      ...(q
        ? {
            programs_translate: {
              some: {
                locale: { in: [locale, fallback] },
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.programs.count({ where }),
      prisma.programs.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          admin_user_id: true,
          image_url: true,
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
      }),
    ]);

    // bentuk DTO dengan name/description terpilih
    const items = rows.map((p) => {
      const t = pickTrans(p.programs_translate, locale, fallback);
      return {
        id: p.id,
        admin_user_id: p.admin_user_id,
        image_url: p.image_url,
        program_category: p.program_category,
        price: p.price,
        phone: p.phone,
        is_published: p.is_published,
        created_at: p.created_at,
        updated_at: p.updated_at,
        locale_used: t?.locale || null,
        name: t?.name || null,
        description: t?.description || null,
      };
    });

    return NextResponse.json({
      data: items,
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
    console.error("GET /api/programs error:", err);
    return NextResponse.json(
      { message: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/programs  (CREATE + auto-translate) ========= */
/**
 * Body:
 *  admin_user_id? (auto dari session jika ada),
 *  image_url?, program_category ('B2B'|'B2C'), price?, phone?, is_published?,
 *  name_id (required), description_id?,
 *  name_en?, description_en?, autoTranslate?=true
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // Accept legacy/panel fields: `name` and `description` as Indonesian defaults
    const name_id = String(
      body?.name_id ?? body?.name ?? ""
    ).trim();
    if (!name_id) return badRequest("name_id (Bahasa Indonesia) wajib diisi");

    const program_category = body?.program_category;
    if (!["B2B", "B2C"].includes(program_category)) {
      return badRequest("program_category harus 'B2B' atau 'B2C'");
    }

    const price =
      body?.price === null || body?.price === undefined
        ? null
        : asInt(body.price, NaN);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return badRequest("price harus bilangan bulat >= 0");
    }

    const adminUserId = await getAdminUserId(req, body);
    if (!adminUserId) {
      return NextResponse.json(
        {
          message:
            "admin_user_id tidak ditemukan (pastikan sudah login & session.user.id tersedia)",
        },
        { status: 401 }
      );
    }

    const autoTranslate = body?.autoTranslate !== false; // default true
    const description_id = String(
      body?.description_id ?? body?.description ?? ""
    );

    const result = await prisma.$transaction(async (tx) => {
      // a) create program (tanpa name/description)
      const program = await tx.programs.create({
        data: {
          id: randomUUID(),
          admin_user_id: adminUserId,
          image_url: body?.image_url ?? null,
          program_category,
          price,
          phone: body?.phone ?? null,
          is_published: Boolean(body?.is_published ?? false),
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });

      // b) simpan 'id'
      await tx.programs_translate.create({
        data: {
          id_programs: program.id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      // c) siapkan 'en' → pakai input jika ada, kalau kosong translate dari 'id'
      let name_en = String(body?.name_en || "").trim();
      let description_en = String(body?.description_en || "").trim();

      if (autoTranslate) {
        if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
        if (!description_en && description_id)
          description_en = await translate(description_id, "id", "en");
      }

      if (name_en || description_en) {
        await tx.programs_translate.create({
          data: {
            id_programs: program.id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return program;
    });

    return NextResponse.json({ data: { id: result.id } }, { status: 201 });
  } catch (err) {
    console.error("POST /api/programs error:", err);
    return NextResponse.json(
      { message: "Failed to create program" },
      { status: 500 }
    );
  }
}
