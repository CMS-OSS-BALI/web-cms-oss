// app/api/mitra-dalam-negeri-categories/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  readBodyFlexible,
  pickLocale,
  pickTrans,
  slugify,
  isValidSlug,
  toMs,
  assertAdmin,
} from "@/app/api/mitra-dalam-negeri-categories/_utils";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET detail ========= */
export async function GET(req, { params }) {
  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const item = await prisma.mitra_categories.findFirst({
      where: { id, deleted_at: null },
      include: {
        mitra_categories_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true },
        },
      },
    });
    if (!item) return notFound("Kategori mitra tidak ditemukan.");

    const t = pickTrans(item.mitra_categories_translate, locale, fallback);

    return json({
      message: "OK",
      data: {
        id: item.id,
        slug: item.slug,
        sort: item.sort,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts: toMs(item.created_at),
        updated_ts: toMs(item.updated_at),
        name: t?.name ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(
      `GET /api/mitra-dalam-negeri-categories/${params?.id} error:`,
      err
    );
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kategori. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
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
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const body = await readBodyFlexible(req);

    const data = {};
    const ops = [];
    let name_id_new;
    const autoTranslate = String(body.autoTranslate ?? "false") === "true";

    // Parent fields
    if (body.slug !== undefined) {
      let s = String(body.slug || "").trim();
      if (!s && body.name_id) s = slugify(String(body.name_id));
      if (!s) return badRequest("Slug tidak boleh kosong.", "slug");
      if (!isValidSlug(s)) {
        return badRequest(
          "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-). Maksimal 100 karakter.",
          "slug"
        );
      }
      data.slug = s;
    }
    if (body.sort !== undefined) {
      const v = parseInt(body.sort, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("sort harus bilangan bulat ≥ 0.", "sort");
      data.sort = v;
    }

    // ID translation
    if (body.name_id !== undefined) {
      name_id_new = String(body.name_id || "");
      ops.push(
        prisma.mitra_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "id" } },
          update: { name: (name_id_new || "(no title)").slice(0, 191) },
          create: {
            id: randomUUID(),
            category_id: id,
            locale: "id",
            name: (name_id_new || "(no title)").slice(0, 191),
          },
        })
      );
    }

    // EN translation (explicit)
    if (body.name_en !== undefined) {
      const name_en = String(body.name_en || "");
      ops.push(
        prisma.mitra_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update: { name: (name_en || "(no title)").slice(0, 191) },
          create: {
            id: randomUUID(),
            category_id: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
          },
        })
      );
    }

    // Apply main update (or ensure exists)
    if (Object.keys(data).length) {
      data.updated_at = new Date();
      await prisma.mitra_categories.update({ where: { id }, data });
    } else {
      const exists = await prisma.mitra_categories.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return notFound("Kategori mitra tidak ditemukan.");
    }

    // Auto-translate ID -> EN
    if (autoTranslate && name_id_new !== undefined) {
      try {
        const name_en_auto = name_id_new
          ? await translate(String(name_id_new), "id", "en")
          : "";
        ops.push(
          prisma.mitra_categories_translate.upsert({
            where: { category_id_locale: { category_id: id, locale: "en" } },
            update: { name: (name_en_auto || "(no title)").slice(0, 191) },
            create: {
              id: randomUUID(),
              category_id: id,
              locale: "en",
              name: (name_en_auto || "(no title)").slice(0, 191),
            },
          })
        );
      } catch (e) {
        console.warn("[auto-translate] name_id -> en failed:", e);
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({
      message: "Kategori mitra berhasil diperbarui.",
      data: { id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (err?.code === "P2002") {
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
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login sebagai admin.");
    if (status === 403)
      return forbidden("Anda tidak memiliki akses ke resource ini.");
    if (err?.code === "P2025")
      return notFound("Kategori mitra tidak ditemukan.");
    console.error(
      `PATCH /api/mitra-dalam-negeri-categories/${params?.id} error:`,
      err
    );
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

/* ========= DELETE (soft) ========= */
export async function DELETE(req, { params }) {
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
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.mitra_categories.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    return json({
      message: "Kategori mitra berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    if (err?.code === "P2025")
      return notFound("Kategori mitra tidak ditemukan.");
    console.error(
      `DELETE /api/mitra-dalam-negeri-categories/${params?.id} error:`,
      err
    );
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
