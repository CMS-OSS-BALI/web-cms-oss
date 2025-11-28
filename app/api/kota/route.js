// app/api/kota/route.js
import prisma from "@/lib/prisma";
import {
  json,
  clampInt,
  pickLocale,
  badRequest,
  DEFAULT_LOCALE,
  EN_LOCALE,
  buildGeoOrderBy,
  kotaInclude,
  projectKotaRow,
  assertAdmin,
  resolveNegaraId,
  parseBigIntId,
} from "@/app/api/geo/_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const runtime = "nodejs";
export const revalidate = 300;

/* ========= GET /api/kota (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const page = Math.max(1, clampInt(searchParams.get("page"), 1, 1e6, 1));
    const perPage = clampInt(searchParams.get("perPage"), 1, 200, 100);
    const orderBy = buildGeoOrderBy(searchParams.get("sort"));

    // 🔁 filter baru: negara_id
    const negaraIdRaw = searchParams.get("negara_id");
    const negara_id = negaraIdRaw ? parseBigIntId(negaraIdRaw) : null;

    let isAdmin = false;
    try {
      await assertAdmin(req);
      isAdmin = true;
    } catch {
      isAdmin = false;
    }
    const withInactive = isAdmin && searchParams.get("with_inactive") === "1";
    const onlyInactive = isAdmin && searchParams.get("only_inactive") === "1";

    const where = {
      ...(onlyInactive
        ? { is_active: false }
        : withInactive
        ? {}
        : { is_active: true }),
      ...(negara_id ? { negara_id } : {}),
      ...(q
        ? {
            kota_translate: {
              some: {
                locale: { in: [locale, fallback] },
                name: { contains: q, mode: "insensitive" },
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.kota.count({ where }),
      prisma.kota.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: kotaInclude({ locale, fallback }),
      }),
    ]);

    const data = rows.map((r) => projectKotaRow(r, { locale, fallback }));

    const cacheControl = isAdmin
      ? "private, no-store, max-age=0"
      : "public, max-age=0, s-maxage=300, stale-while-revalidate=900";

    return json(
      {
        message: "OK",
        data,
        meta: {
          page,
          perPage,
          total,
          totalPages: Math.max(1, Math.ceil(total / perPage)),
          locale,
          fallback,
          negara_id: negara_id?.toString() ?? null,
        },
      },
      { headers: { "Cache-Control": cacheControl } }
    );
  } catch (err) {
    console.error("GET /api/kota error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar kota. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/kota ========= */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const body = (await req.json().catch(() => ({}))) ?? {};

    // 🔁 sekarang pakai negara_id
    let negara_id;
    try {
      negara_id = await resolveNegaraId(body?.negara_id);
    } catch (e) {
      if (e.message === "NEGARA_REQUIRED" || e.message === "NEGARA_NOT_FOUND") {
        return json(
          {
            error: {
              code:
                e.message === "NEGARA_REQUIRED"
                  ? "VALIDATION_ERROR"
                  : "NOT_FOUND",
              message:
                e.message === "NEGARA_REQUIRED"
                  ? "negara_id wajib diisi."
                  : "Negara tidak ditemukan.",
              field: e.field,
            },
          },
          { status: e.message === "NEGARA_REQUIRED" ? 422 : 404 }
        );
      }
      throw e;
    }

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    let name_en = String(body?.name_en || "").trim();

    if (!name_id) {
      return badRequest(
        "Nama kota Bahasa Indonesia (name_id) wajib diisi.",
        "name_id"
      );
    }

    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";

    if (autoTranslate && !name_en && name_id) {
      try {
        const translated = await translate(name_id, DEFAULT_LOCALE, EN_LOCALE);
        name_en = (translated || "").toString();
      } catch (e) {
        console.warn("auto translate kota gagal, skip:", e);
      }
    }

    const isActiveRaw = body?.is_active;
    const is_active =
      typeof isActiveRaw === "boolean"
        ? isActiveRaw
        : !["0", "false", "no"].includes(
            String(isActiveRaw ?? "1").toLowerCase()
          );

    // 🔁 living_cost opsional
    const livingCostRaw = body?.living_cost;
    const living_cost =
      livingCostRaw === undefined ||
      livingCostRaw === null ||
      String(livingCostRaw).trim() === ""
        ? null
        : livingCostRaw;

    const kota = await prisma.$transaction(async (tx) => {
      const base = await tx.kota.create({
        data: {
          negara_id,
          living_cost,
          is_active,
        },
      });

      await tx.kota_translate.create({
        data: {
          kota_id: base.id,
          locale: DEFAULT_LOCALE,
          name: name_id.slice(0, 191),
        },
      });

      if (name_en) {
        await tx.kota_translate.create({
          data: {
            kota_id: base.id,
            locale: EN_LOCALE,
            name: name_en.slice(0, 191),
          },
        });
      }

      return base;
    });

    return json(
      {
        message: "Kota berhasil dibuat.",
        data: {
          id: kota.id,
          negara_id: kota.negara_id,
          living_cost: kota.living_cost,
          name_id,
          name_en: name_en || null,
          is_active,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/kota error:", err);
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
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message:
            "Terjadi kesalahan di sisi server saat membuat kota. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
