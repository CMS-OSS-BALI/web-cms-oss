// app/api/event-categories/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  asInt,
  pickLocale,
  getOrderBy,
  badRequest,
  assertAdmin,
  pickTrans,
  slugify,
  isValidSlug,
  readBodyFlexible,
} from "@/app/api/event-categories/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const orderBy = getOrderBy(searchParams.get("sort"));
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

    const body = await readBodyFlexible(req);

    let slug = String(body?.slug || "").trim();
    const sort = asInt(body?.sort, 0);

    // i18n fields
    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    const description_id =
      typeof body?.description_id === "string"
        ? body.description_id
        : typeof body?.description === "string"
        ? body.description
        : null;

    let name_en = String(body?.name_en || "").trim();
    let description_en = String(body?.description_en || "").trim();
    const autoTranslate = body?.autoTranslate !== false;

    if (!name_id)
      return badRequest("Nama (Bahasa Indonesia) wajib diisi.", "name_id");
    if (!slug) slug = slugify(name_id);
    if (!slug) return badRequest("Slug wajib diisi.", "slug");
    if (!isValidSlug(slug)) {
      return badRequest(
        "Slug hanya boleh huruf kecil, angka, dan tanda minus (-), maks 100 karakter.",
        "slug"
      );
    }
    if (sort < 0) return badRequest("sort harus bilangan bulat ≥ 0.", "sort");

    // auto-translate EN
    if (autoTranslate) {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.event_categories.create({ data: { slug, sort } });

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
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Akses ditolak." } },
        { status: 401 }
      );
    if (status === 403)
      return json(
        { error: { code: "FORBIDDEN", message: "Anda tidak memiliki akses." } },
        { status: 403 }
      );
    if (err?.code === "P2002") {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "Gagal membuat data: slug kategori event sudah digunakan.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/event-categories error:", err);
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
