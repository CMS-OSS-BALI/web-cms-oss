// app/api/jenjang-master/route.js
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  json,
  badRequest,
  clampInt,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  assertAdmin,
  readBody,
  buildOrderBy,
  buildJenjangWhere,
  projectJenjangRow,
} from "./_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= GET /api/jenjang-master ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const page = Math.max(1, clampInt(searchParams.get("page"), 1, 1e6, 1));
    const perPage = clampInt(searchParams.get("perPage"), 1, 100, 20);
    const orderBy = buildOrderBy(searchParams.get("sort"));
    const withInactive = searchParams.get("with_inactive") === "1";
    const onlyInactive = searchParams.get("only_inactive") === "1";

    const where = buildJenjangWhere({
      q,
      locale,
      fallback,
      withInactive,
      onlyInactive,
    });

    const [total, rows] = await Promise.all([
      prisma.jenjang_master.count({ where }),
      prisma.jenjang_master.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          jenjang_master_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: {
              id: true,
              jenjang_id: true,
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((r) => projectJenjangRow(r, { locale, fallback }));

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
    console.error("GET /api/jenjang-master error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar jenjang. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/jenjang-master ========= */
export async function POST(req) {
  try {
    await assertAdmin(req);

    const body = await readBody(req);

    const code = String(body.code || "").trim();
    const name_id = String(body.name_id ?? body.name ?? "").trim();
    const description_id =
      body.description_id != null
        ? String(body.description_id)
        : body.description != null
        ? String(body.description)
        : null;

    const sort = clampInt(body.sort, 0, 1e9, 0);
    const isActiveRaw = body.is_active;
    const is_active =
      isActiveRaw === undefined
        ? true
        : typeof isActiveRaw === "string"
        ? !["0", "false", "no", "off"].includes(
            isActiveRaw.trim().toLowerCase()
          )
        : Boolean(isActiveRaw);

    const autoTranslate = String(body.autoTranslate ?? "true") !== "false";

    if (!code) return badRequest("Kode jenjang wajib diisi.", "code");
    if (code.length > 32)
      return badRequest("Kode jenjang maksimal 32 karakter.", "code");

    if (!name_id)
      return badRequest(
        "Nama jenjang (Bahasa Indonesia) wajib diisi.",
        "name_id"
      );
    if (sort < 0) return badRequest("sort harus bilangan bulat ≥ 0.", "sort");

    let name_en = String(body.name_en || "").trim();
    let description_en = String(body.description_en || "").trim();

    // Auto-translate ID -> EN jika diminta dan belum diisi
    if (autoTranslate) {
      const [tName, tDesc] = await Promise.all([
        !name_en && name_id
          ? translate(name_id, DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(name_en),
        !description_en && description_id
          ? translate(description_id, DEFAULT_LOCALE, EN_LOCALE)
          : Promise.resolve(description_en),
      ]);
      name_en = (tName || name_en || "").toString();
      description_en = (tDesc || description_en || "").toString();
    }

    const created = await prisma.$transaction(async (tx) => {
      const id = randomUUID();
      const trIdId = randomUUID();
      const trEnId = randomUUID();

      const jenjang = await tx.jenjang_master.create({
        data: {
          id,
          code,
          name: name_id.slice(0, 100),
          sort,
          is_active,
        },
      });

      await tx.jenjang_master_translate.create({
        data: {
          id: trIdId,
          jenjang_id: jenjang.id,
          locale: DEFAULT_LOCALE,
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (name_en || description_en) {
        await tx.jenjang_master_translate.create({
          data: {
            id: trEnId,
            jenjang_id: jenjang.id,
            locale: EN_LOCALE,
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return jenjang;
    });

    return json(
      {
        message: "Data jenjang berhasil dibuat.",
        data: {
          id: created.id,
          code,
          sort,
          is_active,
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      // duplikat code
      return json(
        {
          error: {
            code: "DUPLICATE",
            message: "Gagal membuat data: kode jenjang sudah digunakan.",
            field: "code",
          },
        },
        { status: 409 }
      );
    }
    if (err instanceof Response) return err;
    console.error("POST /api/jenjang-master error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
