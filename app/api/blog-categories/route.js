// app/api/blog-categories/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { translate } from "@/app/utils/geminiTranslator";

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
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function badRequest(message, field, hint) {
  return json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(field ? { field } : {}),
        ...(hint ? { hint } : {}),
      },
    },
    { status: 400 }
  );
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
function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
function isValidSlug(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 100;
}
// accept form-data / urlencoded / json
async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries())
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "sort"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}

/* ========= GET /api/blog-categories (LIST) ========= */
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
            translate: {
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
      prisma.blog_categories.count({ where }),
      prisma.blog_categories.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          translate: {
            where: { locale: { in: [locale, fallback] } },
            select: {
              id: true,
              category_id: true,
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.translate, locale, fallback);
      const created_ts = r?.created_at
        ? new Date(r.created_at).getTime()
        : null;
      const updated_ts = r?.updated_at
        ? new Date(r.updated_at).getTime()
        : null;
      return {
        id: r.id,
        slug: r.slug,
        sort: r.sort,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        created_ts,
        updated_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      };
    });

    return json({
      message: "OK",
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
    console.error("GET /api/blog-categories error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar kategori. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/blog-categories (CREATE) ========= */
export async function POST(req) {
  try {
    const admin_user_id = await getAdminUserId();
    if (!admin_user_id) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }

    const body = await readBody(req);
    let slug = String(body.slug || "").trim();
    const name_id = String(body.name_id ?? body.name ?? "").trim();
    const description_id =
      body.description_id != null
        ? String(body.description_id)
        : body.description != null
        ? String(body.description)
        : null;
    const name_en_input = String(body.name_en || "").trim();
    const description_en_input = String(body.description_en || "").trim();
    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";
    const sort = asInt(body.sort, 0);

    if (!name_id)
      return badRequest(
        "Nama kategori (Bahasa Indonesia) wajib diisi.",
        "name_id"
      );
    if (!slug) slug = slugify(name_id);
    if (!isValidSlug(slug)) {
      return badRequest(
        "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-). Maksimal 100 karakter.",
        "slug"
      );
    }
    if (sort < 0) return badRequest("sort harus bilangan bulat ≥ 0.", "sort");

    let name_en = name_en_input;
    let description_en = description_en_input;

    if (autoTranslate) {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const created = await prisma.$transaction(async (tx) => {
      const cat = await tx.blog_categories.create({
        data: { slug, sort },
      });

      await tx.blog_categories_translate.create({
        data: {
          category_id: cat.id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (name_en || description_en) {
        await tx.blog_categories_translate.create({
          data: {
            category_id: cat.id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return cat;
    });

    return json(
      {
        message: "Kategori blog berhasil dibuat.",
        data: {
          id: created.id,
          slug,
          sort,
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      // unique constraint (mis. slug)
      return json(
        {
          error: {
            code: "DUPLICATE",
            message: "Slug sudah digunakan. Gunakan slug lain.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/blog-categories error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
