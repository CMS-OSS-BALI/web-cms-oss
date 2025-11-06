// app/api/testimonial-categories/[id]/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  assertAdmin,
  readBodyFlexible,
  normalizeLocale,
  trimOrNull,
  slugify,
  isValidSlug,
  ensureUniqueSlug,
  toTs,
  DEFAULT_LOCALE,
  EN_LOCALE,
} from "../_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============== GET (detail) ============== */
export async function GET(req, { params }) {
  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const url = new URL(req.url);
    const locale = normalizeLocale(
      url.searchParams.get("locale"),
      DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE,
      DEFAULT_LOCALE
    );

    const cat = await prisma.testimonial_categories.findUnique({
      where: { id },
      include: {
        translate: {
          where: { locale: { in: [locale, fallback] } },
          select: { locale: true, name: true },
        },
      },
    });
    if (!cat) return notFound("Kategori testimonial tidak ditemukan.");

    const pick =
      cat.translate?.find((t) => t.locale === locale) ||
      cat.translate?.find((t) => t.locale === fallback) ||
      null;

    return json({
      message: "OK",
      data: {
        id: cat.id,
        slug: cat.slug,
        name: pick?.name ?? null,
        locale_used: pick?.locale ?? null,
        created_at: cat.created_at ?? undefined,
        updated_at: cat.updated_at ?? undefined,
        created_ts: toTs(cat.created_at),
        updated_ts: toTs(cat.updated_at),
      },
    });
  } catch (e) {
    console.error("GET /api/testimonial-categories/[id] error:", e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kategori testimonial.",
        },
      },
      { status: 500 }
    );
  }
}

/* ============== PUT (update) ============== */
export async function PUT(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const body = await readBodyFlexible(req);
    const locale =
      normalizeLocale(body.locale) ||
      normalizeLocale(new URL(req.url).searchParams.get("locale"));

    const slugInput = trimOrNull(body.slug, 100);
    const name =
      trimOrNull(body.name, 191) ??
      (locale === "id"
        ? trimOrNull(body.name_id, 191)
        : trimOrNull(body.name_en, 191));
    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";

    // pastikan parent ada
    const exist = await prisma.testimonial_categories.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exist) return notFound("Kategori testimonial tidak ditemukan.");

    const ops = [];

    // Update slug bila ada
    if (slugInput) {
      const s = slugify(slugInput);
      if (!isValidSlug(s)) {
        return badRequest(
          "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-), maks 100 karakter.",
          "slug"
        );
      }
      const newSlug = await ensureUniqueSlug(s, id);
      ops.push(
        prisma.testimonial_categories.update({
          where: { id },
          data: { slug: newSlug },
        })
      );
    }

    // Upsert terjemahan bila name ada
    if (name) {
      ops.push(
        prisma.testimonial_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale } },
          update: { name },
          create: { category_id: id, locale, name },
        })
      );

      if (autoTranslate) {
        const pairLocale = locale === EN_LOCALE ? DEFAULT_LOCALE : EN_LOCALE;
        try {
          const namePair = await translate(name, locale, pairLocale);
          ops.push(
            prisma.testimonial_categories_translate.upsert({
              where: {
                category_id_locale: { category_id: id, locale: pairLocale },
              },
              update: { name: (namePair || name).slice(0, 191) },
              create: {
                category_id: id,
                locale: pairLocale,
                name: (namePair || name).slice(0, 191),
              },
            })
          );
        } catch (err) {
          console.warn("Auto-translate category update failed:", err?.message);
        }
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    // balikan data terbaru (pakai locale/fallback)
    const locales = [locale, DEFAULT_LOCALE];
    const latest = await prisma.testimonial_categories.findUnique({
      where: { id },
      include: {
        translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true },
        },
      },
    });
    if (!latest) return notFound("Kategori testimonial tidak ditemukan.");

    const pick =
      latest.translate?.find((t) => t.locale === locale) ||
      latest.translate?.find((t) => t.locale === DEFAULT_LOCALE) ||
      null;

    return json({
      message: "Kategori testimonial berhasil diperbarui.",
      data: {
        id: latest.id,
        slug: latest.slug,
        name: pick?.name ?? null,
        locale_used: pick?.locale ?? null,
        created_at: latest.created_at ?? undefined,
        updated_at: latest.updated_at ?? undefined,
        created_ts: toTs(latest.created_at),
        updated_ts: toTs(latest.updated_at),
      },
    });
  } catch (e) {
    if (e?.code === "P2002") {
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
    console.error("PUT /api/testimonial-categories/[id] error:", e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat memperbarui kategori testimonial.",
        },
      },
      { status: 500 }
    );
  }
}

/* ============== DELETE (hard delete, sesuai schema asli) ============== */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    await prisma.testimonial_categories.delete({ where: { id } });

    return json({
      message: "Kategori testimonial berhasil dihapus.",
      data: { id },
    });
  } catch (e) {
    if (e?.code === "P2025")
      return notFound("Kategori testimonial tidak ditemukan.");
    console.error("DELETE /api/testimonial-categories/[id] error:", e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus kategori testimonial.",
        },
      },
      { status: 500 }
    );
  }
}
