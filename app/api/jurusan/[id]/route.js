// app/api/jurusan/[id]/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  badRequest,
  notFound,
  readBodyFlexible,
  normalizeLocale,
  mapJurusan,
  assertAdmin,
} from "@/app/api/jurusan/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

/* ================= GET (detail) ================= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id is required", "id");

    const url = new URL(req.url);
    const locale = normalizeLocale(
      url.searchParams.get("locale"),
      DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE,
      DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.jurusan.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        college_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        jurusan_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!row) return notFound();

    return json({ message: "OK", data: mapJurusan(row, locale, fallback) });
  } catch (err) {
    console.error(`GET /api/jurusan/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch jurusan" } },
      { status: 500 }
    );
  }
}

/* ================= PUT/PATCH (update) ================= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("id is required", "id");

    const body = await readBodyFlexible(req);
    const locale = normalizeLocale(body.locale, DEFAULT_LOCALE);

    const ops = [];

    // parent update (optional)
    if (body.college_id !== undefined) {
      const college_id = String(body.college_id || "").trim();
      if (!college_id)
        return badRequest("college_id cannot be empty", "college_id");
      // pre-check FK
      const college = await prisma.college.findUnique({
        where: { id: college_id },
        select: { id: true },
      });
      if (!college)
        return badRequest("college_id invalid (not found)", "college_id");
      ops.push(
        prisma.jurusan.update({
          where: { id },
          data: { college_id, updated_at: new Date() },
        })
      );
    } else {
      const exists = await prisma.jurusan.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return notFound();
    }

    // translation update (optional)
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
      const update = {};
      if (hasName) update.name = name;
      if (hasDesc) update.description = description;

      ops.push(
        prisma.jurusan_translate.upsert({
          where: { id_jurusan_locale: { id_jurusan: id, locale } },
          update,
          create: {
            id_jurusan: id,
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

        const enUpdate = {};
        if (nameEn !== undefined) enUpdate.name = nameEn;
        if (descEn !== undefined) enUpdate.description = descEn ?? null;

        ops.push(
          prisma.jurusan_translate.upsert({
            where: { id_jurusan_locale: { id_jurusan: id, locale: EN_LOCALE } },
            update: enUpdate,
            create: {
              id_jurusan: id,
              locale: EN_LOCALE,
              name: enUpdate.name ?? (hasName ? name : "(no title)"),
              description:
                enUpdate.description ?? (hasDesc ? description : null),
            },
          })
        );
      }
    }

    if (ops.length) await prisma.$transaction(ops);

    // return latest minimal
    const locales = [locale, DEFAULT_LOCALE];
    const updated = await prisma.jurusan.findUnique({
      where: { id },
      select: {
        id: true,
        college_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        jurusan_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!updated) return notFound();

    return json({
      message: "Updated",
      data: mapJurusan(updated, locale, DEFAULT_LOCALE),
    });
  } catch (err) {
    if (err?.code === "P2003")
      return badRequest("college_id invalid (FK failed)", "college_id");
    if (err?.code === "P2025") return notFound();
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Access denied" } },
        { status: 401 }
      );
    if (status === 403)
      return json(
        { error: { code: "FORBIDDEN", message: "Not allowed" } },
        { status: 403 }
      );
    console.error(`PATCH /api/jurusan/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to update jurusan" } },
      { status: 500 }
    );
  }
}

/* ================= DELETE (soft) ================= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("id is required", "id");

    const deleted = await prisma.jurusan.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    return json({ message: "Deleted", data: { id: deleted.id } });
  } catch (err) {
    if (err?.code === "P2025") return notFound();
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Access denied" } },
        { status: 401 }
      );
    if (status === 403)
      return json(
        { error: { code: "FORBIDDEN", message: "Not allowed" } },
        { status: 403 }
      );
    console.error(`DELETE /api/jurusan/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete jurusan" } },
      { status: 500 }
    );
  }
}
