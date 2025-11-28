// app/api/negara/route.js
import prisma from "@/lib/prisma";
import {
  json,
  clampInt,
  pickLocale,
  badRequest,
  DEFAULT_LOCALE,
  EN_LOCALE,
  buildGeoOrderBy,
  negaraInclude,
  projectNegaraRow,
  assertAdmin,
  readBodyAndFile,
  uploadNegaraFlag,
  toPublicUrl,
} from "@/app/api/geo/_utils";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const revalidate = 300;

/* ========= GET /api/negara (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const page = Math.max(1, clampInt(searchParams.get("page"), 1, 1e6, 1));
    const perPage = clampInt(searchParams.get("perPage"), 1, 200, 100);
    const orderBy = buildGeoOrderBy(searchParams.get("sort"));

    // Admin bisa lihat yang non-aktif
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
      ...(q
        ? {
            negara_translate: {
              some: {
                locale: { in: [locale, fallback] },
                name: { contains: q },
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.negara.count({ where }),
      prisma.negara.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: negaraInclude({ locale, fallback }),
      }),
    ]);

    const data = rows.map((r) => projectNegaraRow(r, { locale, fallback }));

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
        },
      },
      { headers: { "Cache-Control": cacheControl } }
    );
  } catch (err) {
    console.error("GET /api/negara error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar negara. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/negara ========= */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    let name_en = String(body?.name_en || "").trim();

    if (!name_id) {
      return badRequest(
        "Nama negara Bahasa Indonesia (name_id) wajib diisi.",
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
        console.warn("auto translate negara gagal, skip:", e);
      }
    }

    const isActiveRaw = body?.is_active;
    const is_active =
      typeof isActiveRaw === "boolean"
        ? isActiveRaw
        : !["0", "false", "no"].includes(
            String(isActiveRaw ?? "1").toLowerCase()
          );

    // Upload bendera (optional)
    let flagUrl = null;
    if (file) {
      try {
        const uploadId = randomUUID(); // hanya untuk penamaan folder
        flagUrl = await uploadNegaraFlag(file, uploadId);
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
        console.error("upload negara flag error:", e);
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
    } else if (body?.flag) {
      flagUrl = toPublicUrl(String(body.flag || "").trim());
    }

    const negara = await prisma.$transaction(async (tx) => {
      const base = await tx.negara.create({
        data: {
          flag: flagUrl,
          is_active,
        },
      });

      await tx.negara_translate.create({
        data: {
          negara_id: base.id,
          locale: DEFAULT_LOCALE,
          name: name_id.slice(0, 191),
        },
      });

      if (name_en) {
        await tx.negara_translate.create({
          data: {
            negara_id: base.id,
            locale: EN_LOCALE,
            name: name_en.slice(0, 191),
          },
        });
      }

      return base;
    });

    return json(
      {
        message: "Negara berhasil dibuat.",
        data: {
          id: negara.id,
          flag: flagUrl ? toPublicUrl(flagUrl) : null,
          name_id,
          name_en: name_en || null,
          is_active,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/negara error:", err);
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
            "Terjadi kesalahan di sisi server saat membuat negara. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
