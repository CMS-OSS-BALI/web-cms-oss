// app/api/blog/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  notFound,
  badRequest,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  blogInclude,
  projectBlogRow,
  assertAdmin,
  readBodyAndFile,
  resolveCategoryId,
  uploadBlogImage,
  toPublicUrl,
  removeStorageObjects,
} from "@/app/api/blog/_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const runtime = "nodejs";
export const revalidate = 600;

/* ========= GET /api/blog/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const includeCategory =
      new URL(req.url).searchParams.get("include_category") === "1";

    const item = await prisma.blog.findFirst({
      where: { id, deleted_at: null },
      include: blogInclude({ locale, fallback, includeCategory }),
    });
    if (!item) return notFound();

    return json(
      {
        message: "OK",
        data: projectBlogRow(item, { locale, fallback, includeCategory }),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    console.error(`GET /api/blog/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail blog. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/blog/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    // Snapshot untuk cek perubahan image & cleanup
    const before = await prisma.blog.findUnique({
      where: { id },
      select: { id: true, image_url: true, category_id: true },
    });
    if (!before) return notFound();

    const { body, file } = await readBodyAndFile(req);

    const blogData = {};
    let name_id_new, desc_id_new;
    const forceAuto = String(body?.autoTranslate ?? "false") === "true";

    // image
    if (file) {
      try {
        blogData.image_url = await uploadBlogImage(file, id); // URL publik final
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json(
            {
              error: {
                code: "PAYLOAD_TOO_LARGE",
                message: "Ukuran file melebihi 10MB.",
                field: "file",
              },
            },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            {
              error: {
                code: "UNSUPPORTED_TYPE",
                message: "Format gambar harus JPEG, PNG, atau WebP.",
                field: "file",
              },
            },
            { status: 415 }
          );
        console.error("upload error:", e);
        return json(
          {
            error: {
              code: "UPLOAD_FAILED",
              message: "Gagal mengunggah gambar.",
            },
          },
          { status: 500 }
        );
      }
    } else if ("image_url" in body) {
      const v = String(body.image_url || "").trim();
      blogData.image_url = v ? toPublicUrl(v) : null;
    }

    if ("views_count" in body) {
      const v = parseInt(body.views_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest(
          "views_count harus bilangan bulat >= 0.",
          "views_count"
        );
      blogData.views_count = v;
    }
    if ("likes_count" in body) {
      const v = parseInt(body.likes_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest(
          "likes_count harus bilangan bulat >= 0.",
          "likes_count"
        );
      blogData.likes_count = v;
    }

    // translations (ID)
    if ("name_id" in body || "description_id" in body) {
      name_id_new = "name_id" in body ? String(body.name_id) : undefined;
      desc_id_new =
        "description_id" in body ? String(body.description_id) : undefined;
    }

    // category (opsional)
    if ("category_id" in body || "category_slug" in body) {
      try {
        blogData.category_id = await resolveCategoryId({
          category_id: body?.category_id,
          category_slug: body?.category_slug,
        });
      } catch (e) {
        if (e.message === "CATEGORY_NOT_FOUND")
          return json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "Kategori tidak ditemukan.",
                field: e.field,
              },
            },
            { status: 422 }
          );
        throw e;
      }
    }

    // transaksi satu atap
    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.blog.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return null;

      if (Object.keys(blogData).length) {
        blogData.updated_at = new Date();
        await tx.blog.update({ where: { id }, data: blogData });
      }

      if (name_id_new !== undefined || desc_id_new !== undefined) {
        await tx.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: DEFAULT_LOCALE } },
          update: {
            ...(name_id_new !== undefined
              ? { name: String(name_id_new || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_id_new !== undefined
              ? { description: String(desc_id_new || "") || null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: DEFAULT_LOCALE,
            name: String(name_id_new || "(no title)").slice(0, 191),
            description: String(desc_id_new || "") || null,
          },
        });
      }

      // direct EN input
      if ("name_en" in body || "description_en" in body) {
        const name_en =
          "name_en" in body ? String(body.name_en || "(no title)") : undefined;
        const desc_en =
          "description_en" in body
            ? String(body.description_en || "")
            : undefined;

        await tx.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: EN_LOCALE } },
          update: {
            ...(name_en !== undefined ? { name: name_en.slice(0, 191) } : {}),
            ...(desc_en !== undefined ? { description: desc_en || null } : {}),
          },
          create: {
            id_blog: id,
            locale: EN_LOCALE,
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en || null,
          },
        });
      }

      // auto translate EN bila diminta & ada perubahan ID
      if (
        forceAuto &&
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

        await tx.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: EN_LOCALE } },
          update: {
            ...(name_en_auto
              ? { name: String(name_en_auto).slice(0, 191) }
              : {}),
            ...(desc_en_auto !== undefined
              ? { description: String(desc_en_auto || "") || null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: EN_LOCALE,
            name: String(name_en_auto || "(no title)").slice(0, 191),
            description: String(desc_en_auto || "") || null,
          },
        });
      }

      return tx.blog.findUnique({
        where: { id },
        select: { id: true, image_url: true, category_id: true },
      });
    });

    if (!result) return notFound();

    // Cleanup best-effort jika ganti gambar
    try {
      const prev = before.image_url || null;
      const next = result.image_url || null;
      if (prev && next && prev !== next) {
        await removeStorageObjects([prev]);
      }
    } catch {}

    return json({
      message: "Blog berhasil diperbarui.",
      data: {
        id: result.id,
        image_url: toPublicUrl(result.image_url ?? null),
        category_id: result.category_id ?? null,
      },
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
    console.error(`PATCH /api/blog/${params?.id} error:`, err);
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

/* ========= DELETE /api/blog/:id ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    // Soft delete (tetap seperti semula). Kalau mau hard-delete + cleanup file,
    // bisa tambahkan removeStorageObjects di sini.
    const deleted = await prisma.blog.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    return json({
      message: "Blog berhasil dihapus (soft delete).",
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
    console.error(`DELETE /api/blog/${params?.id} error:`, err);
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
