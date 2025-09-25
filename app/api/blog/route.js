// app/api/blog/route.js
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
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
  const allowed = new Set([
    "created_at",
    "updated_at",
    "views_count",
    "likes_count",
  ]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
async function getAdminUserId() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
    if (session?.user?.email) {
      const admin = await prisma.admin_users.findUnique({
        where: { email: session.user.email },
      });
      if (admin?.id) return admin.id;
    }
  } catch (e) {
    console.error("getAdminUserId error:", e);
  }
  return null;
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ========= GET /api/blog (LIST) ========= */
/**
 * Query:
 *  - q            : search pada blog_translate.name/description (locale|fallback)
 *  - locale       : default 'id'
 *  - fallback     : default 'id'
 *  - page, perPage, sort
 *  - with_deleted=1 | only_deleted=1
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
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
      ...(q
        ? {
            blog_translate: {
              some: {
                locale: { in: [locale, fallback] },
                OR: [
                  { name: { contains: q } }, // gunakan collation DB untuk CI
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.blog.count({ where }),
      prisma.blog.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          blog_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: {
              id: true,
              id_blog: true,
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.blog_translate, locale, fallback);
      return {
        id: r.id,
        image_url: r.image_url,
        views_count: r.views_count,
        likes_count: r.likes_count,
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
    console.error("GET /api/blog error:", err);
    return NextResponse.json(
      { message: "Failed to fetch blog list" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/blog (CREATE + auto-translate) ========= */
/**
 * Body:
 *  - image_url (required)
 *  - name_id (required) | name (fallback sebagai ID)
 *  - description_id? | description?
 *  - name_en?, description_en?
 *  - autoTranslate? default true (ID → EN via Gemini bila field EN kosong)
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const image_url = String(body?.image_url || "").trim();
    if (!image_url) return badRequest("image_url wajib diisi");

    // dukung fallback: name/description → dianggap versi Indonesia
    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    if (!name_id) return badRequest("name_id (Bahasa Indonesia) wajib diisi");
    const description_id =
      typeof body?.description_id === "string"
        ? body.description_id
        : typeof body?.description === "string"
        ? body.description
        : null;

    const autoTranslate = body?.autoTranslate !== false; // default true
    let name_en = String(body?.name_en || "").trim();
    let description_en = String(body?.description_en || "").trim();

    // cari admin_user_id dari session
    const admin_user_id = await getAdminUserId();
    if (!admin_user_id) {
      return NextResponse.json(
        { message: "Unauthorized (session admin tidak ditemukan)" },
        { status: 401 }
      );
    }

    const id = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      // a) parent
      const parent = await tx.blog.create({
        data: {
          id,
          admin_user_id,
          image_url,
        },
      });

      // b) translate ID
      await tx.blog_translate.create({
        data: {
          id_blog: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      // c) siapkan EN (prioritas body, kalau kosong translate dari ID)
      if (autoTranslate) {
        if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
        if (!description_en && description_id)
          description_en = await translate(description_id, "id", "en");
      }

      if (name_en || description_en) {
        await tx.blog_translate.create({
          data: {
            id_blog: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        data: {
          id: created.id,
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
    console.error("POST /api/blog error:", err);
    return NextResponse.json(
      { message: "Failed to create blog" },
      { status: 500 }
    );
  }
}
