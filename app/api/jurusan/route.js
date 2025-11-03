// app/api/jurusan/route.js
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import {
  json,
  badRequest,
  notFound,
  asInt,
  pickTrans,
  readQuery,
  readBodyFlexible,
  normalizeLocale,
  mapJurusan,
  assertAdmin,
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

    const sortParam = String(sp.get("sort") || "created_at:desc");
    const [sortField = "created_at", sortDirRaw = "desc"] =
      sortParam.split(":");
    const sortDir = sortDirRaw === "asc" ? "asc" : "desc";
    const allowed = new Set(["created_at", "updated_at", "name"]);
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

    // MySQL: tanpa mode: 'insensitive' (default collation biasanya ci)
    const where = {
      ...baseDeleted,
      ...(college_id ? { college_id } : {}),
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
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

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    // pre-check FK agar errornya ramah (daripada nunggu P2003)
    const college = await prisma.college.findUnique({
      where: { id: college_id },
      select: { id: true },
    });
    if (!college)
      return badRequest("college_id invalid (not found)", "college_id");

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.jurusan.create({
        data: { college_id, created_at: new Date(), updated_at: new Date() },
      });

      await tx.jurusan_translate.upsert({
        where: { id_jurusan_locale: { id_jurusan: parent.id, locale } },
        update: { name, description },
        create: { id_jurusan: parent.id, locale, name, description },
      });

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
      return badRequest("college_id invalid (FK failed)", "college_id");
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
