// app/api/jurusan/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
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
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "register_price"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}
function normalizeUrl255(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  // potong ke 255 utk match @db.VarChar(255)
  return s.slice(0, 255);
}

/* ========= GET /api/jurusan (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const partner_id = (searchParams.get("partner_id") || "").trim() || null;

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(partner_id ? { partner_id } : {}),
      ...(q
        ? {
            jurusan_translate: {
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

    const [total, rows] = await Promise.all([
      prisma.jurusan.count({ where }),
      prisma.jurusan.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          jurusan_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: {
              id: true,
              id_jurusan: true,
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.jurusan_translate, locale, fallback);
      return {
        id: r.id,
        partner_id: r.partner_id,
        image_url: r.image_url, // ← baru
        register_price:
          r.register_price == null
            ? null
            : typeof r.register_price === "object" &&
              "toString" in r.register_price
            ? r.register_price.toString()
            : String(r.register_price),
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      };
    });

    return json({
      data,
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
    console.error("GET /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to fetch jurusan list" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/jurusan (CREATE) ========= */
export async function POST(req) {
  try {
    await assertAdmin();

    const body = await req.json().catch(() => ({}));
    const partner_id = String(body?.partner_id || "").trim();
    if (!partner_id) return badRequest("partner_id wajib diisi");

    const priceRaw = body?.register_price;
    if (
      priceRaw === undefined ||
      priceRaw === null ||
      String(priceRaw).trim() === ""
    ) {
      return badRequest("register_price wajib diisi");
    }
    const register_price = String(priceRaw).trim();

    // field baru: image_url Wajib (schema String non-null, 255)
    const image_url = normalizeUrl255(body?.image_url);
    if (!image_url) return badRequest("image_url wajib diisi");

    const name_id = String(body?.name_id ?? "").trim();
    if (!name_id) return badRequest("name_id (Bahasa Indonesia) wajib diisi");
    const description_id =
      typeof body?.description_id === "string" ? body.description_id : null;

    const autoTranslate = body?.autoTranslate !== false;
    let name_en = String(body?.name_en || "").trim();
    let description_en =
      typeof body?.description_en === "string" ? body.description_en : "";

    const id = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.jurusan.create({
        data: { id, partner_id, register_price, image_url },
      });

      await tx.jurusan_translate.create({
        data: {
          id: randomUUID(),
          id_jurusan: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (autoTranslate) {
        if (!name_en && name_id) {
          try {
            name_en = await translate(name_id, "id", "en");
          } catch (e) {
            console.error(e);
          }
        }
        if (!description_en && description_id) {
          try {
            description_en = await translate(description_id, "id", "en");
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (name_en || description_en) {
        await tx.jurusan_translate.create({
          data: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }
    });

    return json(
      {
        data: {
          id,
          partner_id,
          register_price,
          image_url,
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "partner_id tidak valid (FK gagal)" },
        { status: 400 }
      );
    }
    console.error("POST /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to create jurusan" },
      { status: 500 }
    );
  }
}
