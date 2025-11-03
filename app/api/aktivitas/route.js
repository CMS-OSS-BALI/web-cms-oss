// /app/api/aktivitas/route.js
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import {
  DEFAULT_LOCALE,
  json,
  asInt,
  toBool,
  normalizeLocale,
  pickTrans,
  getOrderBy,
  toPublicUrl,
  toMs,
  assertAdmin,
  readBodyAndFile,
  uploadAktivitasImage,
} from "@/app/api/aktivitas/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- GET (list) -------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const locale = normalizeLocale(
      searchParams.get("locale") || DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));

    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const is_published = toBool(searchParams.get("is_published"), null);

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(is_published === null ? {} : { is_published }),
      ...(q
        ? {
            translate: {
              some: {
                locale: { in: locales },
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.aktivitas.count({ where }),
      prisma.aktivitas.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
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
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.translate, locale, fallback);
      return {
        id: r.id,
        image_url: toPublicUrl(r.image_url),
        sort: r.sort,
        is_published: r.is_published,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        created_ts: toMs(r.created_at),
        updated_ts: toMs(r.updated_at),
        deleted_at_ts: toMs(r.deleted_at),
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      };
    });

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
    console.error("GET /api/aktivitas error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar aktivitas.",
        },
      },
      { status: 500 }
    );
  }
}

/* -------------------- POST (create, admin) -------------------- */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    // File > URL (prioritaskan file jika ada)
    let image_url = "";
    if (file) {
      try {
        image_url = await uploadAktivitasImage(file);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json({ message: "Gambar max 10MB" }, { status: 413 });
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            { message: "Gambar harus JPEG/PNG/WebP" },
            { status: 415 }
          );
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return json(
            { message: "Supabase bucket belum disetel" },
            { status: 500 }
          );
        console.error("uploadAktivitasImage error:", e);
        return json({ message: "Upload gambar gagal" }, { status: 500 });
      }
    } else {
      image_url = String(body?.image_url || "").trim();
    }

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    const description_id =
      body?.description_id !== undefined
        ? String(body.description_id)
        : body?.description !== undefined
        ? String(body.description)
        : null;

    if (!image_url)
      return json(
        { message: "image_url atau file gambar wajib" },
        { status: 400 }
      );
    if (!name_id)
      return json({ message: "name_id (judul ID) wajib" }, { status: 400 });

    const sort = asInt(body?.sort, 0);
    const is_published = toBool(body?.is_published, false) ?? false;

    // Auto-translate (paralel)
    let name_en = String(body?.name_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";

    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    if (autoTranslate) {
      const tasks = [];
      if (!name_en && name_id)
        tasks.push(
          (async () =>
            (name_en = await (
              await import("@/app/utils/geminiTranslator")
            ).translate(name_id, "id", "en")))()
        );
      if (!description_en && description_id)
        tasks.push(
          (async () =>
            (description_en = await (
              await import("@/app/utils/geminiTranslator")
            ).translate(description_id, "id", "en")))()
        );
      if (tasks.length) {
        try {
          await Promise.all(tasks);
        } catch (e) {
          console.warn(
            "Auto-translate gagal, lanjut tanpa EN:",
            e?.message || e
          );
        }
      }
    }

    const id = randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.aktivitas.create({
        data: {
          id,
          admin_user_id: adminId,
          image_url,
          sort,
          is_published,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: {
          id: true,
          image_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

      await tx.aktivitas_translate.create({
        data: {
          id_aktivitas: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id ?? null,
        },
      });

      if (name_en || description_en) {
        await tx.aktivitas_translate.create({
          data: {
            id_aktivitas: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        message: "Aktivitas berhasil dibuat.",
        data: {
          id: created.id,
          image_url: toPublicUrl(created.image_url || image_url),
          sort,
          is_published,
          created_at: created.created_at,
          updated_at: created.updated_at,
          deleted_at: created.deleted_at ?? null,
          created_ts: toMs(created.created_at),
          updated_ts: toMs(created.updated_at),
          deleted_at_ts: toMs(created.deleted_at),
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/aktivitas error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Terjadi kesalahan server." } },
      { status: 500 }
    );
  }
}
