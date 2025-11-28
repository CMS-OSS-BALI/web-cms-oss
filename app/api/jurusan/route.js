import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  badRequest,
  asInt,
  readQuery,
  readBodyFlexible,
  normalizeLocale,
  mapJurusan,
  assertAdmin,
  toDecimalNullable,
  toBigIntNullable,
} from "@/app/api/jurusan/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

/* ================= GET (list) ================= */
export async function GET(req) {
  try {
    const sp = readQuery(req);
    const page = Math.max(1, asInt(sp.get("page"), 1));
    const perPage = Math.min(100, Math.max(1, asInt(sp.get("perPage"), 10)));
    const q = (sp.get("q") || "").trim();
    const college_id = (sp.get("college_id") || "").trim() || undefined;

    // optional filter by kota_id (BigInt)
    const kotaId = toBigIntNullable(sp.get("kota_id"));

    const sortParam = String(sp.get("sort") || "created_at:desc");
    const [sortField = "created_at", sortDirRaw = "desc"] =
      sortParam.split(":");
    const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

    // izinkan sortir by harga juga
    const allowed = new Set(["created_at", "updated_at", "name", "harga"]);
    const nameSort = sortField === "name";
    const orderBy =
      !allowed.has(sortField) || nameSort
        ? [{ created_at: "desc" }]
        : [{ [sortField]: sortDir }];

    const locale = normalizeLocale(sp.get("locale"), DEFAULT_LOCALE);
    const fallback = normalizeLocale(
      sp.get("fallback") || DEFAULT_LOCALE,
      DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const withDeleted = sp.get("with_deleted") === "1";
    const onlyDeleted = sp.get("only_deleted") === "1";
    const baseDeleted = onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null };

    const where = {
      ...baseDeleted,
      ...(college_id ? { college_id } : {}),
      ...(kotaId !== null ? { kota_id: kotaId } : {}),
      ...(q
        ? {
            jurusan_translate: {
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
      prisma.jurusan.count({ where }),
      prisma.jurusan.findMany({
        where,
        orderBy: nameSort ? undefined : orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          college_id: true,
          kota_id: true,
          kota_multi: {
            select: {
              kota_id: true,
              kota: {
                select: {
                  id: true,
                  kota_translate: {
                    where: { locale: { in: locales } },
                    select: { locale: true, name: true },
                  },
                },
              },
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
          harga: true,
          jurusan_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    let data = rows.map((r) => mapJurusan(r, locale, fallback));
    if (nameSort) {
      data.sort((a, b) => {
        const A = (a.name || "").toLowerCase();
        const B = (b.name || "").toLowerCase();
        if (A === B) return 0;
        return sortDir === "asc" ? (A > B ? 1 : -1) : A < B ? 1 : -1;
      });
    }

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
    console.error("GET /api/jurusan error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch jurusan list",
        },
      },
      { status: 500 }
    );
  }
}

/* ================= POST (create) ================= */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const body = await readBodyFlexible(req);

    const college_id = String(body?.college_id || "").trim();
    if (!college_id) return badRequest("college_id is required", "college_id");

    const locale = normalizeLocale(body.locale, DEFAULT_LOCALE);
    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name is required", "name");

    const description =
      body.description !== undefined && body.description !== null
        ? String(body.description)
        : null;

    const hargaDec = toDecimalNullable(body.harga);
    if (hargaDec && hargaDec.lessThan(0))
      return badRequest("harga cannot be negative", "harga");

    // kota_id optional (BigInt) - allow multiple -> use first as legacy, store all in jurusan_kota
    let kotaIds = [];
    if (Object.prototype.hasOwnProperty.call(body, "kota_id")) {
      const raw = Array.isArray(body.kota_id)
        ? body.kota_id
        : [body.kota_id];
      const cleaned = raw
        .map((v) => toBigIntNullable(v))
        .filter((v) => v !== null);
      kotaIds = Array.from(new Set(cleaned));

      // verify all kota exist
      for (const kid of kotaIds) {
        const kota = await prisma.kota.findUnique({
          where: { id: kid },
          select: { id: true },
        });
        if (!kota) return badRequest("kota_id invalid (not found)", "kota_id");
      }
    }

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    // pre-check FK college
    const college = await prisma.college.findUnique({
      where: { id: college_id },
      select: { id: true },
    });
    if (!college)
      return badRequest("college_id invalid (not found)", "college_id");

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.jurusan.create({
        data: {
          college_id,
          harga: hargaDec ?? null,
          kota_id: kotaIds[0] ?? null, // legacy column (first kota)
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      if (kotaIds.length) {
        await tx.jurusan_kota.createMany({
          data: kotaIds.map((k) => ({
            jurusan_id: parent.id,
            kota_id: k,
          })),
          skipDuplicates: true,
        });
      }

      // translation (locale utama)
      await tx.jurusan_translate.upsert({
        where: { id_jurusan_locale: { id_jurusan: parent.id, locale } },
        update: { name, description },
        create: { id_jurusan: parent.id, locale, name, description },
      });

      // auto translate ke EN
      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.jurusan_translate.upsert({
          where: {
            id_jurusan_locale: { id_jurusan: parent.id, locale: EN_LOCALE },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_jurusan: parent.id,
            locale: EN_LOCALE,
            name: nameEn || name,
            description: descEn ?? description,
          },
        });
      }

      return parent;
    });

    return json(
      { message: "Created", data: { id: created.id } },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2003") {
      return badRequest("college_id or kota_id invalid (FK failed)", "fk");
    }
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
    console.error("POST /api/jurusan error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to create jurusan" } },
      { status: 500 }
    );
  }
}
