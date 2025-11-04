import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  asInt,
  readQuery,
  readBodyFlexible,
  normalizeLocale,
  pickTrans,
  toTs,
  DEFAULT_LOCALE,
  EN_LOCALE,
  toDecimalNullable,
  toNullableLongText, // ← NEW
  assertAdmin,
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
    jurusan_id: row.jurusan_id ?? null,
    college_id: row.college_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    created_ts,
    updated_ts,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
    harga: row.harga ?? null, // Decimal → number by sanitize
    in_take: row.in_take ?? null, // ← NEW
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

    const sortParam = String(sp.get("sort") || "created_at:desc");
    const [sortFieldRaw = "created_at", sortDirRaw = "desc"] =
      sortParam.split(":");
    const sortField = sortFieldRaw.toLowerCase();
    const sortDir = sortDirRaw.toLowerCase() === "asc" ? "asc" : "desc";

    const locale = normalizeLocale(sp.get("locale"), DEFAULT_LOCALE);
    const fallback = normalizeLocale(
      sp.get("fallback") || DEFAULT_LOCALE,
      DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const withDeleted = sp.get("with_deleted") === "1";
    const onlyDeleted = sp.get("only_deleted") === "1";
    const deletedFilter = onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null };

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

    // name sort → in-memory agar sesuai terjemahan aktif
    if (sortField === "name") {
      const rowsAll = await prisma.prodi.findMany({
        where,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          jurusan_id: true,
          college_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          harga: true,
          in_take: true, // ← NEW
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
        const c = A > B ? 1 : -1;
        return sortDir === "asc" ? c : -c;
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

    // DB-side sort: created_at / updated_at / harga
    const [total, rows] = await Promise.all([
      prisma.prodi.count({ where }),
      prisma.prodi.findMany({
        where,
        orderBy:
          sortField === "updated_at"
            ? [{ updated_at: sortDir }]
            : sortField === "harga"
            ? [{ harga: sortDir }, { created_at: "desc" }]
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
          harga: true,
          in_take: true, // ← NEW
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

    const jurusan_id_raw = body?.jurusan_id ?? null; // opsional
    const jurusan_id = jurusan_id_raw ? String(jurusan_id_raw).trim() : null;

    const locale = normalizeLocale(body.locale, DEFAULT_LOCALE);
    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name is required", "name");

    const description =
      body.description !== undefined && body.description !== null
        ? String(body.description)
        : null;

    const hargaDec = toDecimalNullable(body.harga); // PrismaDecimal|null
    if (hargaDec && hargaDec.lessThan(0))
      return badRequest("harga cannot be negative", "harga");

    const in_take = toNullableLongText(body.in_take); // ← NEW

    // derive/validate college_id
    let college_id = null;
    if (jurusan_id) {
      const jur = await prisma.jurusan.findUnique({
        where: { id: jurusan_id },
        select: { id: true, college_id: true },
      });
      if (!jur)
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
      college_id = jur.college_id ?? null;
    } else if (body.college_id) {
      college_id = String(body.college_id).trim() || null;
      if (college_id) {
        const col = await prisma.college.findUnique({
          where: { id: college_id },
          select: { id: true },
        });
        if (!col)
          return badRequest("college_id invalid (not found)", "college_id");
      }
    }

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";
    const id = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.prodi.create({
        data: {
          id,
          jurusan_id,
          college_id,
          harga: hargaDec ?? null,
          in_take, // ← NEW
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await tx.prodi_translate.upsert({
        where: { id_prodi_locale: { id_prodi: parent.id, locale } },
        update: { name, description },
        create: { id_prodi: parent.id, locale, name, description },
      });

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
