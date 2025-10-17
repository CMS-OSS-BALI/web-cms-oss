// app/api/event-categories/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
function asInt(v, dflt = 0) {
  if (v === null || v === undefined || v === "") return dflt;
  const n = parseInt(String(v), 10);
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
  // format: "field:asc|desc"
  const allowed = new Set(["sort", "created_at", "updated_at"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }];
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
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return admin.id;
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/* ========= GET /api/event-categories (LIST) ========= */
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
    const orderBy = getOrderBy(searchParams.get("sort")); // e.g. sort:asc | created_at:desc
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const locales = locale === fallback ? [locale] : [locale, fallback];

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
                locale: { in: locales },
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
      prisma.event_categories.count({ where }),
      prisma.event_categories.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.translate, locale, fallback);
      return {
        id: r.id,
        slug: r.slug,
        sort: r.sort,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
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
    console.error("GET /api/event-categories error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar kategori event.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/event-categories ========= */
export async function POST(req) {
  try {
    await assertAdmin();

    const ct = req.headers.get("content-type") || "";
    let slug = "";
    let sort = 0;

    // i18n fields
    let name_id = "";
    let description_id = null;
    let name_en = "";
    let description_en = "";
    let autoTranslate = true;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      slug = String(form.get("slug") || "").trim();
      sort = asInt(form.get("sort"), 0);

      name_id = String(form.get("name_id") ?? form.get("name") ?? "").trim();
      description_id =
        form.get("description_id") != null
          ? String(form.get("description_id"))
          : form.get("description") != null
          ? String(form.get("description"))
          : null;

      name_en = String(form.get("name_en") || "").trim();
      description_en = String(form.get("description_en") || "").trim();
      autoTranslate = String(form.get("autoTranslate") ?? "true") !== "false";
    } else {
      const body = await req.json().catch(() => ({}));

      slug = String(body?.slug || "").trim();
      sort = asInt(body?.sort, 0);

      name_id = String(body?.name_id ?? body?.name ?? "").trim();
      description_id =
        typeof body?.description_id === "string"
          ? body.description_id
          : typeof body?.description === "string"
          ? body.description
          : null;

      name_en = String(body?.name_en || "").trim();
      description_en = String(body?.description_en || "").trim();
      autoTranslate = body?.autoTranslate !== false;
    }

    if (!name_id) {
      return badRequest("Nama (Bahasa Indonesia) wajib diisi.", "name_id");
    }
    if (!slug) slug = slugify(name_id);
    if (!slug) return badRequest("Slug wajib diisi.", "slug");
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) {
      return badRequest(
        "Slug hanya boleh huruf kecil, angka, dan tanda minus (-), maks 100 karakter.",
        "slug"
      );
    }

    // auto-translate ke EN bila diminta
    if (autoTranslate) {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.event_categories.create({
        data: { slug, sort },
      });

      // id
      await tx.event_categories_translate.create({
        data: {
          category_id: parent.id,
          locale: "id",
          name: name_id,
          description: description_id || null,
        },
      });

      // en (opsional)
      if (name_en || description_en) {
        await tx.event_categories_translate.upsert({
          where: {
            category_id_locale: { category_id: parent.id, locale: "en" },
          },
          update: {
            ...(name_en ? { name: name_en } : {}),
            ...(description_en !== undefined
              ? { description: description_en || null }
              : {}),
          },
          create: {
            category_id: parent.id,
            locale: "en",
            name: name_en || name_id,
            description: description_en || description_id || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        message: "Kategori event berhasil dibuat.",
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
    const code = err?.code || err?.meta?.target;
    if (err?.code === "P2002") {
      // unique constraint (slug)
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "Slug sudah digunakan. Gunakan slug lain.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        { error: { code: "UNAUTHORIZED", message: "Akses ditolak." } },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        { error: { code: "FORBIDDEN", message: "Anda tidak memiliki akses." } },
        { status: 403 }
      );
    }
    console.error("POST /api/event-categories error:", err, code);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat membuat kategori event.",
        },
      },
      { status: 500 }
    );
  }
}
