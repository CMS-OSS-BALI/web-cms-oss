// app/api/event-categories/[id]/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  pickLocale,
  badRequest,
  notFound,
  pickTrans,
  assertAdmin,
  slugify,
  isValidSlug,
  readBodyFlexible,
} from "@/app/api/event-categories/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET /api/event-categories/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const item = await prisma.event_categories.findFirst({
      where: { id, deleted_at: null },
      include: {
        translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!item) return notFound();

    const t = pickTrans(item.translate, locale, fallback);

    return json({
      message: "OK",
      data: {
        id: item.id,
        slug: item.slug,
        sort: item.sort,
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kategori event.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/event-categories/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const body = await readBodyFlexible(req);

    // nilai kandidat update (undefined = tidak diubah)
    let slug =
      body.slug !== undefined ? String(body.slug || "").trim() : undefined;
    let sort =
      body.sort !== undefined
        ? (() => {
            const n = parseInt(body.sort, 10);
            if (!Number.isFinite(n) || n < 0)
              throw badRequest("sort harus bilangan bulat >= 0", "sort");
            return n;
          })()
        : undefined;

    let name_id = body.name_id !== undefined ? String(body.name_id) : undefined;
    let description_id =
      body.description_id !== undefined
        ? body.description_id === null
          ? null
          : String(body.description_id)
        : undefined;

    let name_en = body.name_en !== undefined ? String(body.name_en) : undefined;
    let description_en =
      body.description_en !== undefined
        ? body.description_en === null
          ? null
          : String(body.description_en)
        : undefined;

    const autoTranslate = String(body?.autoTranslate ?? "false") === "true";

    // validasi/derive slug bila diubah
    if (slug !== undefined) {
      let finalSlug = slug;
      if (!finalSlug && name_id) finalSlug = slugify(String(name_id));
      if (!finalSlug)
        return badRequest("Slug wajib diisi ketika mengubah slug.", "slug");
      if (!isValidSlug(finalSlug)) {
        return badRequest(
          "Slug hanya boleh huruf kecil, angka, dan tanda minus (-), maks 100 karakter.",
          "slug"
        );
      }
      slug = finalSlug;
    }

    await prisma.$transaction(async (tx) => {
      const exists = await tx.event_categories.findUnique({ where: { id } });
      if (!exists)
        throw Object.assign(new Error("NOT_FOUND"), { code: "P2025" });

      // update parent
      const data = {};
      if (slug !== undefined) data.slug = slug;
      if (sort !== undefined) data.sort = sort;
      if (Object.keys(data).length) {
        data.updated_at = new Date();
        await tx.event_categories.update({ where: { id }, data });
      }

      // upsert i18n: ID
      if (name_id !== undefined || description_id !== undefined) {
        const update = {};
        if (name_id !== undefined) update.name = name_id || "";
        if (description_id !== undefined)
          update.description = description_id ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "id" } },
          update,
          create: {
            category_id: id,
            locale: "id",
            name: update.name ?? "",
            description: update.description ?? null,
          },
        });
      }

      // upsert i18n: EN (manual)
      if (name_en !== undefined || description_en !== undefined) {
        const update = {};
        if (name_en !== undefined) update.name = name_en || "";
        if (description_en !== undefined)
          update.description = description_en ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update,
          create: {
            category_id: id,
            locale: "en",
            name: update.name ?? "",
            description: update.description ?? null,
          },
        });
      }

      // auto-translate ke EN saat ID berubah
      if (
        autoTranslate &&
        (name_id !== undefined || description_id !== undefined)
      ) {
        const nameEnAuto =
          name_id !== undefined && name_id !== ""
            ? await translate(String(name_id), "id", "en")
            : undefined;
        const descEnAuto =
          description_id !== undefined
            ? await translate(String(description_id || ""), "id", "en")
            : undefined;

        const update = {};
        if (nameEnAuto) update.name = nameEnAuto;
        if (descEnAuto !== undefined) update.description = descEnAuto ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update,
          create: {
            category_id: id,
            locale: "en",
            name: update.name ?? (name_id ? String(name_id) : ""),
            description:
              update.description !== undefined
                ? update.description
                : description_id ?? null,
          },
        });
      }
    });

    return json({
      message: "Kategori event berhasil diperbarui.",
      data: { id },
    });
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
            message: "Gagal memperbarui data: slug kategori event sudah digunakan.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat memperbarui kategori event.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/event-categories/:id ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.event_categories.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({
      message: "Kategori event berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
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
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus kategori event.",
        },
      },
      { status: 500 }
    );
  }
}
