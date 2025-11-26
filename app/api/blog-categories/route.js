// app/api/blog-categories/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  clampInt,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  assertAdmin,
  readBody,
  slugify,
  isValidSlug,
  buildOrderBy,
  buildCategoryWhere,
  projectCategoryRow,
} from "./_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET /api/blog-categories ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const page = Math.max(1, clampInt(searchParams.get("page"), 1, 1e6, 1));
    const perPage = clampInt(searchParams.get("perPage"), 1, 100, 12);
    const orderBy = buildOrderBy(searchParams.get("sort"));
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const where = buildCategoryWhere({
      q,
      locale,
      fallback,
      withDeleted,
      onlyDeleted,
    });

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

    const data = rows.map((r) => projectCategoryRow(r, { locale, fallback }));

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

/* ========= POST /api/blog-categories ========= */
export async function POST(req) {
  try {
    await assertAdmin(req);

    const body = await readBody(req);
    let slug = String(body.slug || "").trim();
    const name_id = String(body.name_id ?? body.name ?? "").trim();
    const description_id =
      body.description_id != null
        ? String(body.description_id)
        : body.description != null
        ? String(body.description)
        : null;

    const sort = clampInt(body.sort, 0, 1e9, 0);
    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";

    if (!name_id)
      return badRequest(
        "Nama kategori (Bahasa Indonesia) wajib diisi.",
        "name_id"
      );
    if (!slug) slug = slugify(name_id);
    if (!isValidSlug(slug))
      return badRequest(
        "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-). Maksimal 100 karakter.",
        "slug"
      );
    if (sort < 0) return badRequest("sort harus bilangan bulat ≥ 0.", "sort");

    let name_en = String(body.name_en || "").trim();
    let description_en = String(body.description_en || "").trim();

    if (autoTranslate) {
      const [tName, tDesc] = await Promise.all([
        !name_en && name_id
          ? translate(name_id, DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(name_en),
        !description_en && description_id
          ? translate(description_id, DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(description_en),
      ]);
      name_en = (tName || name_en || "").toString();
      description_en = (tDesc || description_en || "").toString();
    }

    const created = await prisma.$transaction(async (tx) => {
      const cat = await tx.blog_categories.create({ data: { slug, sort } });

      await tx.blog_categories_translate.create({
        data: {
          category_id: cat.id,
          locale: DEFAULT_LOCALE,
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (name_en || description_en) {
        await tx.blog_categories_translate.create({
          data: {
            category_id: cat.id,
            locale: EN_LOCALE,
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
      return json(
        {
          error: {
            code: "DUPLICATE",
            message:
              "Gagal membuat data: slug kategori blog sudah digunakan.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    if (err instanceof Response) return err;
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
