// app/api/mitra-dalam-negeri-categories/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  asInt,
  readQuery,
  readBodyFlexible,
  pickLocale,
  pickTrans,
  slugify,
  isValidSlug,
  getOrderBy,
  toMs,
  assertAdmin,
} from "@/app/api/mitra-dalam-negeri-categories/_utils";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto"; // <-- add this

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET (LIST) ========= */
export async function GET(req) {
  try {
    const sp = readQuery(req);
    const q = (sp.get("q") || "").trim();

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const page = Math.max(1, asInt(sp.get("page"), 1));
    const perPage = Math.min(100, Math.max(1, asInt(sp.get("perPage"), 12)));
    const orderBy = getOrderBy(sp.get("sort"));

    const withDeleted = sp.get("with_deleted") === "1";
    const onlyDeleted = sp.get("only_deleted") === "1";

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(q
        ? {
            mitra_categories_translate: {
              some: {
                locale: { in: locales },
                name: { contains: q },
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.mitra_categories.count({ where }),
      prisma.mitra_categories.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          mitra_categories_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.mitra_categories_translate, locale, fallback);
      return {
        id: r.id,
        slug: r.slug,
        sort: r.sort,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        created_ts: toMs(r.created_at),
        updated_ts: toMs(r.updated_at),
        name: t?.name ?? null,
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
    console.error("GET /api/mitra-dalam-negeri-categories error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message:
            "Gagal memuat daftar kategori mitra. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST (CREATE) ========= */
export async function POST(req) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login sebagai admin.");
    if (status === 403)
      return forbidden("Anda tidak memiliki akses ke resource ini.");
    return unauthorized();
  }

  try {
    const body = await readBodyFlexible(req);

    let slug = String(body.slug || "").trim();
    const name_id = String(body.name_id ?? body.name ?? "").trim();
    const sort = asInt(body.sort, 0);

    let name_en = String(body.name_en || "").trim();
    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";

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

    if (autoTranslate && !name_en && name_id) {
      try {
        name_en = await translate(name_id, "id", "en");
      } catch (e) {
        console.warn("[auto-translate] name_id -> en failed:", e);
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const parent = await tx.mitra_categories.create({
        data: {
          id: randomUUID(),
          slug,
          sort,
          created_at: now, // <-- tambahkan
          updated_at: now, // <-- tambahkan
        },
      });

      await tx.mitra_categories_translate.create({
        data: {
          id: randomUUID(),
          category_id: parent.id,
          locale: "id",
          name: name_id.slice(0, 191),
        },
      });

      if (name_en) {
        await tx.mitra_categories_translate.upsert({
          where: {
            category_id_locale: { category_id: parent.id, locale: "en" },
          },
          update: { name: name_en.slice(0, 191) },
          create: {
            id: randomUUID(),
            category_id: parent.id,
            locale: "en",
            name: name_en.slice(0, 191),
          },
        });
      }

      return parent;
    });

    return json(
      {
        message: "Kategori mitra berhasil dibuat.",
        data: { id: created.id, slug, sort, name_id, name_en: name_en || null },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      return json(
        {
          error: {
            code: "DUPLICATE",
            message: "Gagal membuat data: slug kategori mitra sudah digunakan.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/mitra-dalam-negeri-categories error:", err);
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
