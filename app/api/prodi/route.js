// app/api/prodi/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  assertAdmin,
  asInt,
  readQuery,
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

/* ===================== GET (list) ===================== */
export async function GET(req) {
  try {
    const sp = readQuery(req);
    const page = Math.max(1, asInt(sp.get("page"), 1));
    const perPage = Math.min(100, Math.max(1, asInt(sp.get("perPage"), 12)));
    const q = (sp.get("q") || "").trim();
    const jurusan_id = (sp.get("jurusan_id") || "").trim() || undefined;

    const sort = String(sp.get("sort") || "created_at:desc");
    const [sortFieldRaw = "created_at", sortDirRaw = "desc"] = sort.split(":");
    const sortField = sortFieldRaw.toLowerCase();
    const sortDir = sortDirRaw.toLowerCase() === "asc" ? "asc" : "desc";

    const locale = normalizeLocale(sp.get("locale"));
    const fallback = normalizeLocale(sp.get("fallback") || DEFAULT_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const withDeleted = sp.get("with_deleted") === "1";
    const onlyDeleted = sp.get("only_deleted") === "1";
    const deletedFilter = onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null };

    // MySQL: tanpa mode: 'insensitive'; gunakan collation *_ci untuk case-insensitive
    const where = {
      ...deletedFilter,
      ...(jurusan_id ? { jurusan_id } : {}),
      ...(q
        ? {
            prodi_translate: {
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

    // Sort by name → in-memory agar sesuai terjemahan yang dipakai
    if (sortField === "name") {
      const rowsAll = await prisma.prodi.findMany({
        where,
        orderBy: { created_at: "desc" }, // stable fallback
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

      let dataAll = rowsAll.map((r) => mapProdi(r, locale, fallback));
      dataAll.sort((a, b) => {
        const A = (a.name || "").toLowerCase();
        const B = (b.name || "").toLowerCase();
        if (A === B) return 0;
        const comp = A > B ? 1 : -1;
        return sortDir === "asc" ? comp : -comp;
      });

      const total = dataAll.length;
      const start = (page - 1) * perPage;
      const data = dataAll.slice(start, start + perPage);

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
    }

    // DB-side sort for created_at / updated_at
    const [total, rows] = await Promise.all([
      prisma.prodi.count({ where }),
      prisma.prodi.findMany({
        where,
        orderBy:
          sortField === "updated_at"
            ? [{ updated_at: sortDir }]
            : [{ created_at: sortDir }],
        skip: (page - 1) * perPage,
        take: perPage,
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
      }),
    ]);

    const data = rows.map((r) => mapProdi(r, locale, fallback));
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
    console.error("GET /api/prodi error:", err);
    return json(
      {
        error: { code: "SERVER_ERROR", message: "Gagal memuat daftar prodi." },
      },
      { status: 500 }
    );
  }
}

/* ===================== POST (create) ===================== */
export async function POST(req) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401) return unauthorized();
    if (status === 403) return forbidden();
    return unauthorized();
  }

  try {
    const body = await readBodyFlexible(req);

    const jurusan_id = String(body?.jurusan_id || "").trim();
    if (!jurusan_id) return badRequest("jurusan_id is required", "jurusan_id");

    const locale = normalizeLocale(body.locale);
    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name is required", "name");

    const description =
      body.description !== undefined && body.description !== null
        ? String(body.description)
        : null;

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";
    const id = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      // derive college_id from jurusan
      const jur = await tx.jurusan.findUnique({
        where: { id: jurusan_id },
        select: { id: true, college_id: true },
      });
      if (!jur)
        throw Object.assign(new Error("FK_INVALID"), {
          code: "P2003",
          field: "jurusan_id",
        });

      const parent = await tx.prodi.create({
        data: {
          id,
          jurusan_id,
          college_id: jur.college_id ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // primary translation
      await tx.prodi_translate.upsert({
        where: { id_prodi_locale: { id_prodi: parent.id, locale } },
        update: { name, description },
        create: { id_prodi: parent.id, locale, name, description },
      });

      // optional EN translation
      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.prodi_translate.upsert({
          where: {
            id_prodi_locale: { id_prodi: parent.id, locale: EN_LOCALE },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_prodi: parent.id,
            locale: EN_LOCALE,
            name: nameEn || name,
            description: descEn ?? description,
          },
        });
      }

      return parent;
    });

    return json(
      { message: "Prodi berhasil dibuat.", data: { id: created.id } },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2003" || err?.message === "FK_INVALID") {
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
    console.error("POST /api/prodi error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat membuat prodi.",
        },
      },
      { status: 500 }
    );
  }
}
