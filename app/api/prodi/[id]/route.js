// app/api/prodi/[id]/route.js
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
  pickTrans,
  toTs,
  DEFAULT_LOCALE,
  EN_LOCALE,
} from "@/app/api/prodi/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* map DB row → API shape */
function mapProdi(row, locale, fallback) {
  const t = pickTrans(row.prodi_translate || [], locale, fallback);
  const created_ts = toTs(row.created_at) ?? toTs(row.updated_at) ?? null;
  const updated_ts = toTs(row.updated_at) ?? null;
  return {
    id: row.id,
    jurusan_id: row.jurusan_id,
    college_id: row.college_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    created_ts,
    updated_ts,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
  };
}

/* ===================== GET (detail) ===================== */
export async function GET(req, { params }) {
  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("id is required", "id");

    const url = new URL(req.url);
    const locale = normalizeLocale(url.searchParams.get("locale"));
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.prodi.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        jurusan_id: true,
        college_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        prodi_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!row) return notFound("Prodi tidak ditemukan.");
    return json({ message: "OK", data: mapProdi(row, locale, fallback) });
  } catch (err) {
    console.error(`GET /api/prodi/${params?.id} error:`, err);
    return json(
      {
        error: { code: "SERVER_ERROR", message: "Gagal memuat detail prodi." },
      },
      { status: 500 }
    );
  }
}

/* ===================== PUT/PATCH (update) ===================== */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
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
    if (!id) return badRequest("id is required", "id");

    const body = await readBodyFlexible(req);
    const locale = normalizeLocale(body.locale);

    const ops = [];

    // If jurusan_id changes, also re-derive college_id
    if (Object.prototype.hasOwnProperty.call(body, "jurusan_id")) {
      const newJurId = String(body.jurusan_id || "").trim();
      if (!newJurId)
        return badRequest("jurusan_id cannot be empty", "jurusan_id");
      const jur = await prisma.jurusan.findUnique({
        where: { id: newJurId },
        select: { id: true, college_id: true },
      });
      if (!jur) {
        return json(
          {
            error: {
              code: "FK_INVALID",
              field: "jurusan_id",
              message: "jurusan_id invalid (not found)",
            },
          },
          { status: 400 }
        );
      }
      ops.push(
        prisma.prodi.update({
          where: { id },
          data: {
            jurusan_id: newJurId,
            college_id: jur.college_id ?? null,
            updated_at: new Date(),
          },
        })
      );
    } else {
      const exists = await prisma.prodi.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return notFound("Prodi tidak ditemukan.");
    }

    // Update translation if provided
    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasDesc = Object.prototype.hasOwnProperty.call(body, "description");
    const name = hasName ? String(body.name || "").trim() : undefined;
    const description = hasDesc
      ? body.description !== null
        ? String(body.description)
        : null
      : undefined;

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    if (hasName || hasDesc) {
      ops.push(
        prisma.prodi_translate.upsert({
          where: { id_prodi_locale: { id_prodi: id, locale } },
          update: {
            ...(hasName ? { name } : {}),
            ...(hasDesc ? { description } : {}),
          },
          create: {
            id_prodi: id,
            locale,
            name: hasName ? name : "(no title)",
            description: hasDesc ? description : null,
          },
        })
      );

      if (autoTranslate && locale !== EN_LOCALE) {
        const [nameEn, descEn] = await Promise.all([
          hasName && name
            ? translate(name, locale, EN_LOCALE)
            : Promise.resolve(undefined),
          hasDesc && typeof description === "string"
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(undefined),
        ]);

        ops.push(
          prisma.prodi_translate.upsert({
            where: { id_prodi_locale: { id_prodi: id, locale: EN_LOCALE } },
            update: {
              ...(nameEn !== undefined ? { name: nameEn } : {}),
              ...(descEn !== undefined ? { description: descEn ?? null } : {}),
            },
            create: {
              id_prodi: id,
              locale: EN_LOCALE,
              name: nameEn ?? (hasName ? name : "(no title)"),
              description: descEn ?? (hasDesc ? description : null),
            },
          })
        );
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    // return latest detail
    const locales = [locale, DEFAULT_LOCALE];
    const updated = await prisma.prodi.findUnique({
      where: { id },
      select: {
        id: true,
        jurusan_id: true,
        college_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        prodi_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!updated) return notFound("Prodi tidak ditemukan.");
    return json({
      message: "Prodi berhasil diperbarui.",
      data: mapProdi(updated, locale, DEFAULT_LOCALE),
    });
  } catch (err) {
    if (err?.code === "P2003") {
      return json(
        {
          error: {
            code: "FK_INVALID",
            field: "jurusan_id",
            message: "jurusan_id invalid (FK failed)",
          },
        },
        { status: 400 }
      );
    }
    if (err?.code === "P2025") return notFound("Prodi tidak ditemukan.");
    console.error(`PATCH /api/prodi/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat memperbarui prodi.",
        },
      },
      { status: 500 }
    );
  }
}

/* ===================== DELETE (soft) ===================== */
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
    if (!id) return badRequest("id is required", "id");

    const deleted = await prisma.prodi.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true, deleted_at: true },
    });

    return json({
      message: "Prodi berhasil dihapus (soft delete).",
      data: deleted,
    });
  } catch (err) {
    if (err?.code === "P2025") return notFound("Prodi tidak ditemukan.");
    console.error(`DELETE /api/prodi/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus prodi.",
        },
      },
      { status: 500 }
    );
  }
}
