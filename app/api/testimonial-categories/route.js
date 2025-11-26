// app/api/testimonial-categories/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  assertAdmin,
  readQuery,
  readBodyFlexible,
  normalizeLocale,
  pickTrans,
  trimOrNull,
  slugify,
  isValidSlug,
  ensureUniqueSlug,
  getOrderBy,
  toTs,
  DEFAULT_LOCALE,
  EN_LOCALE,
} from "./_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============== GET (list) ============== */
export async function GET(req) {
  try {
    const sp = readQuery(req);
    const locale = normalizeLocale(sp.get("locale"), DEFAULT_LOCALE);
    const fallback = normalizeLocale(
      sp.get("fallback") || DEFAULT_LOCALE,
      DEFAULT_LOCALE
    );
    const q = (sp.get("q") || "").trim();
    const orderBy = getOrderBy(sp.get("sort")); // "slug:asc" | "created_at:desc" | ...

    // Ambil kategori + terjemahan untuk locale & fallback
    const rows = await prisma.testimonial_categories.findMany({
      where: q
        ? {
            translate: {
              some: {
                locale: { in: [locale, fallback] },
                name: { contains: q },
              },
            },
          }
        : {},
      orderBy,
      include: {
        translate: {
          where: { locale: { in: [locale, fallback] } },
          select: { category_id: true, locale: true, name: true },
        },
      },
    });

    const data = rows.map((r) => {
      const t = pickTrans(r.translate || [], locale, fallback);
      return {
        id: r.id,
        slug: r.slug,
        name: t?.name ?? null,
        locale_used: t?.locale ?? null,
        created_at: r.created_at ?? undefined,
        updated_at: r.updated_at ?? undefined,
        created_ts: toTs(r.created_at),
        updated_ts: toTs(r.updated_at),
      };
    });

    return json({ message: "OK", data, meta: { locale, fallback } });
  } catch (e) {
    console.error("GET /api/testimonial-categories error:", e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat kategori testimonial.",
        },
      },
      { status: 500 }
    );
  }
}

/* ============== POST (create) ============== */
export async function POST(req) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const body = await readBodyFlexible(req);

    // Terima: slug?, name?, locale?, autoTranslate?
    // Alias opsional: name_id / name_en bila kamu ingin langsung set keduanya
    let slug = trimOrNull(body.slug, 100);
    const inputLocale = normalizeLocale(body.locale, DEFAULT_LOCALE);

    // nama utama: prioritas name_(locale), fallback ke name
    const nameRaw =
      (inputLocale === "id"
        ? trimOrNull(body.name_id, 191)
        : trimOrNull(body.name_en, 191)) ?? trimOrNull(body.name, 191);

    if (!slug) {
      slug = slugify(nameRaw || "");
    }
    if (!slug) {
      return badRequest("slug atau name wajib diisi", "slug");
    }
    if (!isValidSlug(slug)) {
      return badRequest(
        "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-), maks 100 karakter.",
        "slug"
      );
    }

    slug = await ensureUniqueSlug(slug);

    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";

    // Buat parent + translate
    const created = await prisma.$transaction(async (tx) => {
      const cat = await tx.testimonial_categories.create({
        data: { slug },
        select: { id: true, slug: true, created_at: true, updated_at: true },
      });

      // Tulis terjemahan yang tersedia
      const writes = [];

      if (nameRaw) {
        writes.push(
          tx.testimonial_categories_translate.upsert({
            where: {
              category_id_locale: { category_id: cat.id, locale: inputLocale },
            },
            update: { name: nameRaw },
            create: { category_id: cat.id, locale: inputLocale, name: nameRaw },
          })
        );

        if (autoTranslate) {
          const pairLocale =
            inputLocale === EN_LOCALE ? DEFAULT_LOCALE : EN_LOCALE;
          try {
            const namePair = await translate(nameRaw, inputLocale, pairLocale);
            writes.push(
              tx.testimonial_categories_translate.upsert({
                where: {
                  category_id_locale: {
                    category_id: cat.id,
                    locale: pairLocale,
                  },
                },
                update: { name: (namePair || nameRaw).slice(0, 191) },
                create: {
                  category_id: cat.id,
                  locale: pairLocale,
                  name: (namePair || nameRaw).slice(0, 191),
                },
              })
            );
          } catch (err) {
            console.warn("Auto-translate category name failed:", err?.message);
            writes.push(
              tx.testimonial_categories_translate.upsert({
                where: {
                  category_id_locale: {
                    category_id: cat.id,
                    locale: pairLocale,
                  },
                },
                update: { name: nameRaw },
                create: {
                  category_id: cat.id,
                  locale: pairLocale,
                  name: nameRaw,
                },
              })
            );
          }
        }
      }

      if (writes.length) await Promise.all(writes);
      return cat;
    });

    return json(
      {
        message: "Kategori testimonial berhasil dibuat.",
        data: {
          id: created.id,
          slug: created.slug,
          created_at: created.created_at ?? undefined,
          updated_at: created.updated_at ?? undefined,
          created_ts: toTs(created.created_at),
          updated_ts: toTs(created.updated_at),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (e?.code === "P2002") {
      return json(
        {
          error: {
            code: "CONFLICT",
            message:
              "Gagal membuat data: slug kategori testimonial sudah digunakan.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/testimonial-categories error:", e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat membuat kategori testimonial.",
        },
      },
      { status: 500 }
    );
  }
}
