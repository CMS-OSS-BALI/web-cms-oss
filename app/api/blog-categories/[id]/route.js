// app/api/blog-categories/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  notFound,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  assertAdmin,
  readBody,
  slugify,
  isValidSlug,
  pickTrans,
} from "@/app/api/blog-categories/_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET /api/blog-categories/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);

    const item = await prisma.blog_categories.findFirst({
      where: { id, deleted_at: null },
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
    });
    if (!item) return notFound();

    const t = pickTrans(item.translate, locale, fallback);
    const created_ts = item?.created_at
      ? new Date(item.created_at).getTime()
      : null;
    const updated_ts = item?.updated_at
      ? new Date(item.updated_at).getTime()
      : null;

    return json({
      message: "OK",
      data: {
        id: item.id,
        slug: item.slug,
        sort: item.sort,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts,
        updated_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/blog-categories/${params?.id} error:`, err);
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

/* ========= PUT/PATCH /api/blog-categories/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);

    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const body = await readBody(req);

    const data = {};
    const ops = [];
    let name_id_new, desc_id_new;
    const autoTranslate = String(body.autoTranslate ?? "false") === "true";

    if (body.slug !== undefined) {
      const s = String(body.slug || "").trim();
      if (!s) return badRequest("Slug tidak boleh kosong.", "slug");
      if (!isValidSlug(s))
        return badRequest(
          "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-). Maksimal 100 karakter.",
          "slug"
        );
      data.slug = s;
    }

    if (body.sort !== undefined) {
      const v = parseInt(body.sort, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("sort harus bilangan bulat ≥ 0.", "sort");
      data.sort = v;
    }

    // ID translation changes
    if (body.name_id !== undefined || body.description_id !== undefined) {
      name_id_new =
        body.name_id !== undefined ? String(body.name_id) : undefined;
      desc_id_new =
        body.description_id !== undefined
          ? String(body.description_id)
          : undefined;

      ops.push(
        prisma.blog_categories_translate.upsert({
          where: {
            category_id_locale: { category_id: id, locale: DEFAULT_LOCALE },
          },
          update: {
            ...(name_id_new !== undefined
              ? { name: (name_id_new || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_id_new !== undefined
              ? { description: desc_id_new || null }
              : {}),
          },
          create: {
            category_id: id,
            locale: DEFAULT_LOCALE,
            name: (name_id_new || "(no title)").slice(0, 191),
            description: desc_id_new || null,
          },
        })
      );
    }

    // explicit EN inputs
    if (body.name_en !== undefined || body.description_en !== undefined) {
      const name_en =
        body.name_en !== undefined
          ? String(body.name_en || "(no title)")
          : undefined;
      const desc_en =
        body.description_en !== undefined
          ? String(body.description_en || "")
          : undefined;

      ops.push(
        prisma.blog_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: EN_LOCALE } },
          update: {
            ...(name_en !== undefined ? { name: name_en.slice(0, 191) } : {}),
            ...(desc_en !== undefined ? { description: desc_en || null } : {}),
          },
          create: {
            category_id: id,
            locale: EN_LOCALE,
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en || null,
          },
        })
      );
    }

    // apply main update or ensure exists
    if (Object.keys(data).length) {
      data.updated_at = new Date();
      await prisma.blog_categories.update({ where: { id }, data });
    } else {
      const exists = await prisma.blog_categories.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    // auto-translate ID -> EN if requested
    if (
      autoTranslate &&
      (name_id_new !== undefined || desc_id_new !== undefined)
    ) {
      const [name_en_auto, desc_en_auto] = await Promise.all([
        name_id_new !== undefined
          ? translate(String(name_id_new || ""), DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(undefined),
        desc_id_new !== undefined
          ? translate(String(desc_id_new || ""), DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(undefined),
      ]);

      ops.push(
        prisma.blog_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: EN_LOCALE } },
          update: {
            ...(name_en_auto
              ? { name: String(name_en_auto).slice(0, 191) }
              : {}),
            ...(desc_en_auto !== undefined
              ? { description: String(desc_en_auto || "") || null }
              : {}),
          },
          create: {
            category_id: id,
            locale: EN_LOCALE,
            name: String(name_en_auto || "(no title)").slice(0, 191),
            description: String(desc_en_auto || "") || null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({
      message: "Kategori blog berhasil diperbarui.",
      data: { id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status }
      );
    if (status === 403)
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status }
      );
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
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/blog-categories/${params?.id} error:`, err);
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

/* ========= DELETE /api/blog-categories/:id (soft) ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);

    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.blog_categories.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    return json({
      message: "Kategori blog berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status }
      );
    if (status === 403)
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status }
      );
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/blog-categories/${params?.id} error:`, err);
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
