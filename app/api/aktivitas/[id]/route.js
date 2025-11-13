// /app/api/aktivitas/[id]/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  DEFAULT_LOCALE,
  EN_LOCALE,
  json,
  toBool,
  asInt,
  normalizeLocale,
  pickTrans,
  toPublicUrl,
  toMs,
  assertAdmin,
  readBodyAndFile,
  uploadAktivitasImage,
} from "@/app/api/aktivitas/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- GET (detail) -------------------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const url = new URL(req.url);
    const locale = normalizeLocale(
      url.searchParams.get("locale") || DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));

    const row = await prisma.aktivitas.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        image_url: true,
        sort: true,
        is_published: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!row) return json({ message: "Not found" }, { status: 404 });

    const t = pickTrans(row.translate, locale, fallback);
    return json({
      message: "OK",
      data: {
        id: row.id,
        image_url: toPublicUrl(row.image_url),
        sort: row.sort,
        is_published: row.is_published,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        created_ts: toMs(row.created_at),
        updated_ts: toMs(row.updated_at),
        deleted_at_ts: toMs(row.deleted_at),
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/aktivitas/[id] error:", err);
    return json({ message: "Failed to fetch aktivitas" }, { status: 500 });
  }
}

/* -------------------- PATCH (update, admin) -------------------- */
export async function PATCH(req, { params }) {
  try {
    const { adminId } = await assertAdmin(req);
    if (!adminId) return json({ message: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const { body, file } = await readBodyAndFile(req);

    // file upload wins, else image_url if present
    let image_url = undefined;
    if (file) {
      try {
        image_url = await uploadAktivitasImage(file, id);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json({ message: "Gambar max 10MB" }, { status: 413 });
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            { message: "Gambar harus JPEG/PNG/WebP" },
            { status: 415 }
          );
        console.error("uploadAktivitasImage error:", e);
        return json({ message: "Upload gambar gagal" }, { status: 500 });
      }
    } else if ("image_url" in body) {
      image_url = String(body.image_url || "").trim();
    }

    const sort = "sort" in body ? asInt(body.sort, 0) : undefined;
    const is_published =
      "is_published" in body
        ? toBool(body.is_published, false) ?? false
        : undefined;

    let name_id =
      "name_id" in body ? String(body.name_id || "").trim() : undefined;
    let description_id =
      "description_id" in body ? body.description_id ?? null : undefined;
    let name_en =
      "name_en" in body ? String(body.name_en || "").trim() : undefined;
    let description_en =
      "description_en" in body ? body.description_en ?? null : undefined;

    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";

    // Fetch existing to support bi-directional auto-translate
    const existing = await prisma.aktivitas_translate.findMany({
      where: { id_aktivitas: id, locale: { in: [DEFAULT_LOCALE, EN_LOCALE] } },
      select: { locale: true, name: true, description: true },
    });
    const cur = (lc) => existing.find((x) => x.locale === lc) || null;

    if (autoTranslate) {
      // ID-only -> fill EN
      if (
        (name_id !== undefined || description_id !== undefined) &&
        name_en === undefined &&
        description_en === undefined
      ) {
        const srcName =
          name_id !== undefined ? name_id : cur(DEFAULT_LOCALE)?.name || "";
        const srcDesc =
          description_id !== undefined
            ? description_id
            : cur(DEFAULT_LOCALE)?.description ?? "";
        if (srcName && name_en === undefined)
          name_en = await translate(srcName, "id", "en");
        if (srcDesc && description_en === undefined && srcDesc !== null) {
          description_en = await translate(srcDesc, "id", "en");
        }
      }
      // EN-only -> fill ID
      if (
        (name_en !== undefined || description_en !== undefined) &&
        name_id === undefined &&
        description_id === undefined
      ) {
        const srcName =
          name_en !== undefined ? name_en : cur(EN_LOCALE)?.name || "";
        const srcDesc =
          description_en !== undefined
            ? description_en
            : cur(EN_LOCALE)?.description ?? "";
        if (srcName && name_id === undefined)
          name_id = await translate(srcName, "en", "id");
        if (srcDesc && description_id === undefined && srcDesc !== null) {
          description_id = await translate(srcDesc, "en", "id");
        }
      }
    }

    const updated = await prisma.aktivitas.update({
      where: { id },
      data: {
        updated_at: new Date(),
        ...(image_url !== undefined
          ? { image_url: toPublicUrl(image_url) }
          : {}),
        ...(sort !== undefined ? { sort } : {}),
        ...(is_published !== undefined ? { is_published } : {}),
        ...((name_id !== undefined ||
          description_id !== undefined ||
          name_en !== undefined ||
          description_en !== undefined) && {
          translate: {
            upsert: [
              ...(name_id !== undefined || description_id !== undefined
                ? [
                    {
                      where: {
                        id_aktivitas_locale: {
                          id_aktivitas: id,
                          locale: DEFAULT_LOCALE,
                        },
                      },
                      update: {
                        ...(name_id !== undefined
                          ? { name: String(name_id).slice(0, 191) }
                          : {}),
                        ...(description_id !== undefined
                          ? { description: description_id }
                          : {}),
                        updated_at: new Date(),
                      },
                      create: {
                        locale: DEFAULT_LOCALE,
                        name: String(name_id ?? "(no title)").slice(0, 191),
                        description: description_id ?? null,
                      },
                    },
                  ]
                : []),
              ...(name_en !== undefined || description_en !== undefined
                ? [
                    {
                      where: {
                        id_aktivitas_locale: {
                          id_aktivitas: id,
                          locale: EN_LOCALE,
                        },
                      },
                      update: {
                        ...(name_en !== undefined
                          ? { name: String(name_en).slice(0, 191) }
                          : {}),
                        ...(description_en !== undefined
                          ? { description: description_en }
                          : {}),
                        updated_at: new Date(),
                      },
                      create: {
                        locale: EN_LOCALE,
                        name: String(name_en ?? "(no title)").slice(0, 191),
                        description: description_en ?? null,
                      },
                    },
                  ]
                : []),
            ],
          },
        }),
      },
      select: {
        id: true,
        image_url: true,
        sort: true,
        is_published: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        translate: {
          where: { locale: { in: [DEFAULT_LOCALE, EN_LOCALE] } },
          select: { locale: true },
        },
      },
    });

    const mapped = {
      ...updated,
      image_url: toPublicUrl(updated.image_url),
      created_ts: toMs(updated.created_at),
      updated_ts: toMs(updated.updated_at),
      deleted_at_ts: toMs(updated.deleted_at),
    };

    return json({ message: "Aktivitas diperbarui.", data: mapped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PATCH /api/aktivitas/[id] error:", err);
    return json({ message: "Gagal memperbarui aktivitas" }, { status: 500 });
  }
}

/* -------------------- DELETE (soft, admin) -------------------- */
export async function DELETE(req, { params }) {
  try {
    const { adminId } = await assertAdmin(req);
    if (!adminId) return json({ message: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.aktivitas.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: {
        id: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    const mapped = {
      ...deleted,
      image_url: toPublicUrl(deleted.image_url),
      created_ts: toMs(deleted.created_at),
      updated_ts: toMs(deleted.updated_at),
      deleted_at_ts: toMs(deleted.deleted_at),
    };

    return json({ message: "Aktivitas dihapus.", data: mapped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("DELETE /api/aktivitas/[id] error:", err);
    return json({ message: "Gagal menghapus aktivitas" }, { status: 500 });
  }
}
