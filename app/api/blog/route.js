// app/api/blog/route.js
import {
  json,
  sanitize,
  clampInt,
  parseId,
  pickLocale,
  badRequest,
  DEFAULT_LOCALE,
  EN_LOCALE,
  buildOrderBy,
  buildBlogWhere,
  blogInclude,
  projectBlogRow,
  toPublicUrl,
  assertAdmin,
  readBodyAndFile,
  resolveCategoryId,
  uploadBlogImage,
} from "./_utils";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET /api/blog (LIST) ========= */
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
    const includeCategory = searchParams.get("include_category") === "1";
    const category_id = parseId(searchParams.get("category_id"));
    const category_slug = parseId(searchParams.get("category_slug"));

    const where = buildBlogWhere({
      q,
      locale,
      fallback,
      category_id,
      category_slug,
      withDeleted,
      onlyDeleted,
    });

    const [total, rows] = await Promise.all([
      prisma.blog.count({ where }),
      prisma.blog.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: blogInclude({ locale, fallback, includeCategory }),
      }),
    ]);

    const data = rows.map((r) =>
      projectBlogRow(r, { locale, fallback, includeCategory })
    );

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
    console.error("GET /api/blog error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar blog. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/blog ========= */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    // Siapkan ID lebih awal agar folder upload rapi: cms-oss/blog/<id>/*
    const id = randomUUID();

    // image (harus ada salah satu: file atau image_url)
    let image_url = "";
    if (file) {
      try {
        image_url = await uploadBlogImage(file, id); // URL publik final
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
    } else {
      // Normalisasi input string (bisa key/path atau URL)
      image_url = toPublicUrl(String(body?.image_url || "").trim());
    }

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    const description_id =
      body?.description_id !== undefined
        ? String(body.description_id)
        : body?.description !== undefined
        ? String(body.description)
        : null;

    if (!image_url)
      return badRequest(
        "Gambar wajib diisi. Sertakan 'image_url' atau unggah file (image/file/image_file).",
        "image_url",
        "Kirim multipart/form-data untuk upload file."
      );
    if (!name_id)
      return badRequest(
        "Judul Bahasa Indonesia (name_id) wajib diisi.",
        "name_id"
      );

    // kategori (opsional)
    let resolvedCategoryId = null;
    try {
      resolvedCategoryId = await resolveCategoryId({
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

    // auto-translate
    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    let name_en = String(body?.name_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";

    if (autoTranslate) {
      const [tName, tDesc] = await Promise.all([
        !name_en && name_id
          ? translate(name_id, DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(name_en),
        !description_en && description_id
          ? translate(String(description_id), DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(description_en),
      ]);
      name_en = (tName || name_en || "").toString();
      description_en = (tDesc || description_en || "").toString();
    }

    await prisma.$transaction(async (tx) => {
      await tx.blog.create({
        data: {
          id,
          admin_user_id: adminId,
          // Simpan URL publik langsung
          image_url,
          category_id: resolvedCategoryId,
        },
      });

      await tx.blog_translate.create({
        data: {
          id_blog: id,
          locale: DEFAULT_LOCALE,
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (name_en || description_en) {
        await tx.blog_translate.create({
          data: {
            id_blog: id,
            locale: EN_LOCALE,
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }
    });

    return json(
      {
        message: "Blog berhasil dibuat.",
        data: {
          id,
          image_url: toPublicUrl(image_url),
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
          category_id: resolvedCategoryId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/blog error:", err);
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
