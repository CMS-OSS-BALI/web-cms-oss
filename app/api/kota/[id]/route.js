// app/api/kota/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  pickLocale,
  DEFAULT_LOCALE,
  EN_LOCALE,
  kotaInclude,
  projectKotaRow,
  assertAdmin,
  parseBigIntId,
  resolveNegaraId,
} from "@/app/api/geo/_utils";
import { translate } from "@/app/utils/geminiTranslator";

export const runtime = "nodejs";
export const revalidate = 600;

/* ========= GET /api/kota/:id ========= */
export const GET = async function GET(req, { params }) {
  try {
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);

    const item = await prisma.kota.findUnique({
      where: { id },
      include: kotaInclude({ locale, fallback }),
    });
    if (!item)
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data kota tidak ditemukan.",
          },
        },
        { status: 404 }
      );

    return json(
      {
        message: "OK",
        data: projectKotaRow(item, { locale, fallback }),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (err) {
    console.error(`GET /api/kota/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kota. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
};

/* ========= PUT/PATCH /api/kota/:id ========= */
export const PUT = async function PUT(req, ctx) {
  return PATCH(req, ctx);
};

export const PATCH = async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    const body = (await req.json().catch(() => ({}))) ?? {};
    const data = {};

    // is_active
    if ("is_active" in body) {
      const raw = body.is_active;
      data.is_active =
        typeof raw === "boolean"
          ? raw
          : !["0", "false", "no"].includes(String(raw).toLowerCase());
    }

    // 🔁 pindah negara
    if ("negara_id" in body) {
      try {
        data.negara_id = await resolveNegaraId(body.negara_id);
      } catch (e) {
        if (
          e.message === "NEGARA_REQUIRED" ||
          e.message === "NEGARA_NOT_FOUND"
        ) {
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
    }

    // 🔁 update living_cost
    if ("living_cost" in body) {
      const raw = body.living_cost;
      data.living_cost =
        raw === null || raw === undefined || String(raw).trim() === ""
          ? null
          : raw;
    }

    const name_id =
      "name_id" in body || "name" in body
        ? String(body.name_id ?? body.name ?? "").trim()
        : undefined;
    const name_en =
      "name_en" in body ? String(body.name_en ?? "").trim() : undefined;

    const forceAuto =
      String(body?.autoTranslate ?? "false").toLowerCase() === "true";

    const result = await prisma.$transaction(async (tx) => {
      const exists = await tx.kota.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) return null;

      if (Object.keys(data).length) {
        await tx.kota.update({
          where: { id },
          data: { ...data, updated_at: new Date() },
        });
      }

      if (name_id !== undefined) {
        await tx.kota_translate.upsert({
          where: {
            kota_id_locale: { kota_id: id, locale: DEFAULT_LOCALE },
          },
          update: {
            name: (name_id || "(no name)").slice(0, 191),
          },
          create: {
            kota_id: id,
            locale: DEFAULT_LOCALE,
            name: (name_id || "(no name)").slice(0, 191),
          },
        });
      }

      if (name_en !== undefined) {
        const v = name_en || name_id || "(no name)";
        await tx.kota_translate.upsert({
          where: {
            kota_id_locale: { kota_id: id, locale: EN_LOCALE },
          },
          update: {
            name: v.slice(0, 191),
          },
          create: {
            kota_id: id,
            locale: EN_LOCALE,
            name: v.slice(0, 191),
          },
        });
      }

      if (forceAuto && name_id !== undefined) {
        try {
          const translated = await translate(
            String(name_id || ""),
            DEFAULT_LOCALE,
            EN_LOCALE
          );
          const v = (translated || name_id || "(no name)").toString();
          await tx.kota_translate.upsert({
            where: {
              kota_id_locale: { kota_id: id, locale: EN_LOCALE },
            },
            update: {
              name: v.slice(0, 191),
            },
            create: {
              kota_id: id,
              locale: EN_LOCALE,
              name: v.slice(0, 191),
            },
          });
        } catch (e) {
          console.warn("auto translate kota (PATCH) gagal, skip:", e);
        }
      }

      return tx.kota.findUnique({
        where: { id },
        include: kotaInclude({
          locale: DEFAULT_LOCALE,
          fallback: DEFAULT_LOCALE,
        }),
      });
    });

    if (!result)
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data kota tidak ditemukan.",
          },
        },
        { status: 404 }
      );

    return json({
      message: "Kota berhasil diperbarui.",
      data: projectKotaRow(result, {
        locale: DEFAULT_LOCALE,
        fallback: DEFAULT_LOCALE,
      }),
    });
  } catch (err) {
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
    if (err?.code === "P2025")
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data kota tidak ditemukan.",
          },
        },
        { status: 404 }
      );
    console.error(`PATCH /api/kota/${params?.id} error:`, err);
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
};

/* ========= DELETE /api/kota/:id ========= */
export const DELETE = async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = parseBigIntId(params?.id);
    if (!id)
      return badRequest("Parameter id wajib diisi dan berupa angka.", "id");

    const updated = await prisma.kota.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
      select: { id: true },
    });

    return json({
      message: "Kota berhasil dinonaktifkan.",
      data: { id: updated.id },
    });
  } catch (err) {
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
    if (err?.code === "P2025")
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Data kota tidak ditemukan.",
          },
        },
        { status: 404 }
      );
    console.error(`DELETE /api/kota/${params?.id} error:`, err);
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
};
