// /app/api/events/route.js
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import prisma from "@/lib/prisma";
import {
  DEFAULT_LOCALE,
  json,
  asInt,
  pickLocale,
  getOrderBy,
  toBool,
  toInt,
  toDate,
  normPricingType,
  pickTrans,
  parseId,
  toPublicUrl,
  badRequest,
  assertAdmin,
  readBodyAndFile,
  uploadEventBanner,
  resolveCategoryId,
} from "@/app/api/events/_utils";

export const runtime = "nodejs";
export const revalidate = 300;

/* ========= GET /api/events (LIST) ========= */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    // Public hanya boleh melihat event yang published & tidak terhapus.
    // Parameter with_deleted/only_deleted serta override is_published hanya aktif untuk admin.
    let isAdmin = false;
    try {
      await assertAdmin(req);
      isAdmin = true;
    } catch {
      isAdmin = false;
    }

    const qRaw = (sp.get("q") || "").trim();
    const q = qRaw.length ? qRaw : undefined;

    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));

    const page = Math.max(1, asInt(sp.get("page"), 1));
    const perPage = Math.min(100, Math.max(1, asInt(sp.get("perPage"), 12)));
    const orderBy = getOrderBy(sp.get("sort")); // "start_at:asc" etc
    const withDeleted = isAdmin && sp.get("with_deleted") === "1";
    const onlyDeleted = isAdmin && sp.get("only_deleted") === "1";
    const includeCategory = sp.get("include_category") === "1";

    // Publik dipaksa ke published=true; admin boleh override via query.
    const is_published = isAdmin ? toBool(sp.get("is_published")) : true;
    const from = sp.get("from");
    const to = sp.get("to");
    const status = (sp.get("status") || "").toLowerCase(); // done|upcoming|ongoing

    const category_id = parseId(sp.get("category_id"));
    const category_slug = parseId(sp.get("category_slug"));

    const now = new Date();
    const textFilter = q ? { contains: q } : undefined;

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(typeof is_published === "boolean" ? { is_published } : {}),
      ...(from ? { start_at: { gte: toDate(from) || undefined } } : {}),
      ...(to ? { end_at: { lte: toDate(to) || undefined } } : {}),
      ...(status === "done"
        ? { end_at: { lt: now } }
        : status === "upcoming"
        ? { start_at: { gt: now } }
        : status === "ongoing"
        ? { AND: [{ start_at: { lte: now } }, { end_at: { gte: now } }] }
        : {}),
      ...(q && {
        OR: [
          { location: textFilter },
          {
            events_translate: {
              some: {
                locale: { in: locales },
                OR: [{ title: textFilter }, { description: textFilter }],
              },
            },
          },
          {
            category: {
              translate: {
                some: {
                  locale: { in: locales },
                  OR: [{ name: textFilter }, { description: textFilter }],
                },
              },
            },
          },
        ],
      }),
      ...(category_id ? { category_id } : {}),
      ...(category_slug ? { category: { slug: category_slug } } : {}),
      events_translate: { some: { locale: { in: locales } } },
    };

    const [total, rows] = await Promise.all([
      prisma.events.count({ where }),
      prisma.events.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          admin_user_id: true,
          start_at: true,
          end_at: true,
          location: true,
          banner_url: true,
          is_published: true,
          capacity: true,
          pricing_type: true,
          ticket_price: true,
          category_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          // booth fields
          booth_price: true,
          booth_quota: true,
          booth_sold_count: true,

          events_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, title: true, description: true },
          },
          category: includeCategory
            ? {
                select: {
                  id: true,
                  slug: true,
                  translate: {
                    where: { locale: { in: locales } },
                    select: { locale: true, name: true, description: true },
                  },
                },
              }
            : { select: { id: true, slug: true } },
        },
      }),
    ]);

    // Hitung tiket terjual per event sekali jalan
    const ids = rows.map((e) => e.id);
    let soldMap = {};
    if (ids.length) {
      const soldAgg = await prisma.tickets.groupBy({
        by: ["event_id"],
        where: { event_id: { in: ids }, status: "CONFIRMED", deleted_at: null },
        _count: { id: true },
      });
      soldMap = Object.fromEntries(
        soldAgg.map((r) => [r.event_id, r._count.id])
      );
    }

    const data = rows.map((r) => {
      const t = pickTrans(r.events_translate, locale, fallback);

      const created_ts = r?.created_at
        ? new Date(r.created_at).getTime()
        : null;
      const updated_ts = r?.updated_at
        ? new Date(r.updated_at).getTime()
        : null;
      const start_ts = r?.start_at ? new Date(r.start_at).getTime() : null;
      const end_ts = r?.end_at ? new Date(r.end_at).getTime() : null;

      let category_name = null;
      let category_description = null;
      let category_locale_used = null;
      if (includeCategory && r.category?.translate) {
        const ct = pickTrans(r.category.translate, locale, fallback);
        category_name = ct?.name ?? null;
        category_description = ct?.description ?? null;
        category_locale_used = ct?.locale ?? null;
      }

      const sold = Number(soldMap[r.id] || 0);
      const remaining =
        r.capacity == null ? null : Math.max(0, Number(r.capacity) - sold);
      const booth_remaining =
        r.booth_quota == null
          ? null
          : Math.max(
              0,
              Number(r.booth_quota) - Number(r.booth_sold_count || 0)
            );

      return {
        id: r.id,
        banner_url: toPublicUrl(r.banner_url),
        is_published: r.is_published,
        start_at: r.start_at,
        end_at: r.end_at,
        start_ts,
        end_ts,
        location: r.location,
        capacity: r.capacity,
        pricing_type: r.pricing_type,
        ticket_price: r.ticket_price,
        category_id: r.category?.id ?? null,
        category_slug: r.category?.slug ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        created_ts,
        updated_ts,
        deleted_at: r.deleted_at,
        title: t?.title ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
        sold,
        remaining,
        ...(includeCategory
          ? { category_name, category_description, category_locale_used }
          : {}),
        // booth fields
        booth_price: r.booth_price,
        booth_quota: r.booth_quota,
        booth_sold_count: r.booth_sold_count,
        booth_remaining,
      };
    });

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
    console.error("GET /api/events error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar event. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= POST /api/events ========= */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    // === Generate id lebih awal agar folder upload pakai <eventId>
    const id = randomUUID();

    // Upload banner (opsional)
    let banner_url = "";
    if (file) {
      try {
        banner_url = await uploadEventBanner(file, id); // return PUBLIC URL
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
        console.error("upload banner error:", e);
        return json(
          {
            error: {
              code: "UPLOAD_FAILED",
              message: "Gagal mengunggah banner.",
            },
          },
          { status: 500 }
        );
      }
    } else {
      banner_url = String(body?.banner_url || "").trim();
    }
    if (banner_url.length > 1024)
      return badRequest("banner_url maksimal 1024 karakter", "banner_url");

    // Translations (ID wajib)
    const title_id = String(body?.title_id ?? body?.title ?? "").trim();
    const description_id =
      body?.description_id !== undefined
        ? String(body.description_id)
        : body?.description !== undefined
        ? String(body.description)
        : null;
    if (!title_id)
      return badRequest(
        "Judul Bahasa Indonesia (title_id) wajib diisi.",
        "title_id"
      );

    // Waktu & lokasi
    const start_at = toDate(body?.start_at);
    const end_at = toDate(body?.end_at);
    if (!start_at || !end_at)
      return badRequest("start_at dan end_at wajib diisi.", "start_at");
    if (end_at < start_at)
      return badRequest("end_at harus >= start_at", "end_at");

    const location = String(body?.location || "").trim();
    if (!location) return badRequest("location wajib diisi.", "location");

    // publish / capacity / pricing
    const is_published =
      typeof body?.is_published === "boolean"
        ? body.is_published
        : toBool(body?.is_published) ?? false;
    const capacity = toInt(body?.capacity, null);
    const pricing_type = normPricingType(body?.pricing_type);
    const ticket_price =
      pricing_type === "PAID" ? toInt(body?.ticket_price, 0) : 0;
    if (
      pricing_type === "PAID" &&
      (!Number.isFinite(ticket_price) || ticket_price < 1)
    )
      return badRequest(
        "ticket_price harus >= 1 untuk event berbayar (PAID)",
        "ticket_price"
      );

    // Booth fields
    const booth_price = toInt(body?.booth_price, 0);
    if (!Number.isFinite(booth_price) || booth_price < 0)
      return badRequest("booth_price harus >= 0", "booth_price");
    let booth_quota = toInt(body?.booth_quota, null);
    if (booth_quota !== null && booth_quota < 0)
      return badRequest("booth_quota harus >= 0 atau null", "booth_quota");

    // Kategori (opsional)
    const category_id_in = body?.category_id
      ? String(body.category_id).trim()
      : null;
    const category_slug_in = body?.category_slug
      ? String(body.category_slug).trim()
      : null;

    let resolvedCategoryId = null;
    try {
      resolvedCategoryId = await resolveCategoryId({
        category_id: category_id_in,
        category_slug: category_slug_in,
      });
    } catch (e) {
      if (e.message === "CATEGORY_NOT_FOUND") {
        return json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Kategori tidak ditemukan.",
              field: e.field,
            },
          },
          { status: 422 }
        );
      }
      throw e;
    }

    // EN auto-translate (paralel)
    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    let title_en = String(body?.title_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";

    if (autoTranslate) {
      const tasks = [];
      if (!title_en && title_id)
        tasks.push(translate(title_id, "id", "en").then((t) => (title_en = t)));
      if (!description_en && description_id)
        tasks.push(
          translate(description_id, "id", "en").then(
            (t) => (description_en = t)
          )
        );
      if (tasks.length) {
        try {
          await Promise.all(tasks);
        } catch (e) {
          console.warn("Auto-translate failed, continue:", e?.message || e);
        }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.events.create({
        data: {
          id,
          admin_users: { connect: { id: adminId } },
          // simpan URL publik langsung (atau key lama tetap akan dinormalisasi saat read)
          banner_url: banner_url || null,
          is_published: !!is_published,
          start_at,
          end_at,
          location,
          capacity,
          pricing_type,
          ticket_price: pricing_type === "PAID" ? ticket_price : 0,
          ...(resolvedCategoryId
            ? { category: { connect: { id: resolvedCategoryId } } }
            : {}),
          booth_price,
          booth_quota,
        },
      });

      await tx.events_translate.create({
        data: {
          id_events: id,
          locale: "id",
          title: title_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (title_en || description_en) {
        await tx.events_translate.create({
          data: {
            id_events: id,
            locale: "en",
            title: (title_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }
      return parent;
    });

    return json(
      {
        message: "Event berhasil dibuat.",
        data: {
          id: created.id,
          banner_url: toPublicUrl(banner_url),
          title_id,
          description_id,
          title_en: title_en || null,
          description_en: description_en || null,
          category_id: resolvedCategoryId,
          booth_price,
          booth_quota,
          booth_sold_count: 0,
        },
      },
      { status: 201 }
    );
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
        { status: 401 }
      );
    if (status === 403)
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );

    console.error("POST /api/events error:", err);
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
