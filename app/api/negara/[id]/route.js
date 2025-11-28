// app/api/negara/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  negaraInclude,
  projectNegaraRow,
  assertAdmin,
  parseBigIntId,
  readBodyAndFile,
  uploadNegaraFlag,
  toPublicUrl,
  removeStorageObjects,
} from "@/app/api/geo/_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const runtime = "nodejs";
export const revalidate = 600;

/* ========= GET /api/negara/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);

    const item = await prisma.negara.findUnique({
      where: { id },
      include: negaraInclude({ locale, fallback }),
    });
    if (!item)
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data negara tidak ditemukan.",
          },
        },
        { status: 404 }
      );

    return json(
      {
        message: "OK",
        data: projectNegaraRow(item, { locale, fallback }),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    console.error(`GET /api/negara/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail negara. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/negara/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    // Snapshot sebelum update untuk cleanup flag lama
    const before = await prisma.negara.findUnique({
      where: { id },
      select: { id: true, flag: true },
    });
    if (!before)
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data negara tidak ditemukan.",
          },
        },
        { status: 404 }
      );

    const { body, file } = await readBodyAndFile(req);

    const data = {};
    const forceAuto =
      String(body?.autoTranslate ?? "false").toLowerCase() === "true";

    // === Bendera negara ===
    if (file) {
      try {
        data.flag = await uploadNegaraFlag(file, id.toString());
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
        console.error("upload negara flag (PATCH) error:", e);
        return json(
          {
            error: {
              code: "UPLOAD_FAILED",
              message: "Gagal mengunggah bendera negara.",
            },
          },
          { status: 500 }
        );
      }
    } else if ("flag" in body) {
      const v = String(body.flag || "").trim();
      data.flag = v ? toPublicUrl(v) : null;
    }

    // === Status aktif ===
    if ("is_active" in body) {
      const raw = body.is_active;
      data.is_active =
        typeof raw === "boolean"
          ? raw
          : !["0", "false", "no"].includes(String(raw).toLowerCase());
    }

    // === Terjemahan nama ===
    const name_id =
      "name_id" in body || "name" in body
        ? String(body.name_id ?? body.name ?? "").trim()
        : undefined;
    const name_en =
      "name_en" in body ? String(body.name_en ?? "").trim() : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.negara.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return null;

      if (Object.keys(data).length) {
        await tx.negara.update({
          where: { id },
          data: { ...data, updated_at: new Date() },
        });
      }

      if (name_id !== undefined) {
        await tx.negara_translate.upsert({
          where: {
            negara_id_locale: { negara_id: id, locale: DEFAULT_LOCALE },
          },
          update: {
            name: (name_id || "(no name)").slice(0, 191),
          },
          create: {
            negara_id: id,
            locale: DEFAULT_LOCALE,
            name: (name_id || "(no name)").slice(0, 191),
          },
        });
      }

      if (name_en !== undefined) {
        const v = name_en || name_id || "(no name)";
        await tx.negara_translate.upsert({
          where: {
            negara_id_locale: { negara_id: id, locale: EN_LOCALE },
          },
          update: {
            name: v.slice(0, 191),
          },
          create: {
            negara_id: id,
            locale: EN_LOCALE,
            name: v.slice(0, 191),
          },
        });
      }

      if (forceAuto && name_id !== undefined) {
        try {
          const translated = await translate(
            String(name_id || ""),
            DEFAULT_LOCALE,
            EN_LOCALE
          );
          const v = (translated || name_id || "(no name)").toString();
          await tx.negara_translate.upsert({
            where: {
              negara_id_locale: { negara_id: id, locale: EN_LOCALE },
            },
            update: {
              name: v.slice(0, 191),
            },
            create: {
              negara_id: id,
              locale: EN_LOCALE,
              name: v.slice(0, 191),
            },
          });
        } catch (e) {
          console.warn("auto translate negara (PATCH) gagal, skip:", e);
        }
      }

      return tx.negara.findUnique({
        where: { id },
        include: negaraInclude({
          locale: DEFAULT_LOCALE,
          fallback: DEFAULT_LOCALE,
        }),
      });
    });

    if (!result)
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data negara tidak ditemukan.",
          },
        },
        { status: 404 }
      );

    // Cleanup bendera lama (best-effort)
    try {
      const prev = before.flag || null;
      const next = result.flag || null;
      if (prev && next && prev !== next) {
        await removeStorageObjects([prev]);
      }
    } catch (e) {
      console.warn("cleanup old negara flag error:", e);
    }

    return json({
      message: "Negara berhasil diperbarui.",
      data: projectNegaraRow(result, {
        locale: DEFAULT_LOCALE,
        fallback: DEFAULT_LOCALE,
      }),
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
    if (err?.code === "P2025")
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data negara tidak ditemukan.",
          },
        },
        { status: 404 }
      );
    console.error(`PATCH /api/negara/${params?.id} error:`, err);
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

/* ========= DELETE /api/negara/:id ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    // Soft delete: set is_active = 0
    const updated = await prisma.negara.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
      select: { id: true },
    });

    return json({
      message: "Negara berhasil dinonaktifkan.",
      data: { id: updated.id },
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
    if (err?.code === "P2025")
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data negara tidak ditemukan.",
          },
        },
        { status: 404 }
      );
    console.error(`DELETE /api/negara/${params?.id} error:`, err);
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
