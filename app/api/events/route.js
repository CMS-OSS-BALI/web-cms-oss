import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- config -------------------- */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const BUCKET = process.env.SUPABASE_BUCKET;
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* -------------------- utils -------------------- */
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "start_at", "end_at"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
function badRequest(message, field, hint) {
  return json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(field ? { field } : {}),
        ...(hint ? { hint } : {}),
      },
    },
    { status: 400 }
  );
}
function toBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}
function toInt(v, dflt = null) {
  if (v === "" || v === undefined || v === null) return dflt;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : dflt;
}
function toDate(v) {
  if (!v && v !== 0) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function normPricingType(v) {
  const s = String(v || "").toUpperCase();
  return s === "PAID" ? "PAID" : "FREE";
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
const parseId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
/** Supabase path → public URL */
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** session OR x-admin-key (untuk Postman) */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw new Response("Forbidden", { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/** JSON / form-data → { body, file }  (file key: banner|file|banner_file|banner_url) */
async function readBodyAndFile(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const key of ["banner", "file", "banner_file", "banner_url"]) {
      const f = form.get(key);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/* ========= Supabase upload ========= */
async function uploadEventBanner(file) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024; // 10MB
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if ((file.size || 0) > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (!allowed.includes(file.type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `events/${new Date().toISOString().slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath; // simpan PATH di DB
}

/* ========= Category helpers ========= */
async function resolveCategoryId({ category_id, category_slug }) {
  const byId = parseId(category_id);
  const bySlug = parseId(category_slug);
  if (byId) {
    const exists = await prisma.event_categories.findUnique({
      where: { id: byId },
      select: { id: true },
    });
    if (!exists)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_id",
      });
    return byId;
  }
  if (bySlug) {
    const found = await prisma.event_categories.findUnique({
      where: { slug: bySlug },
      select: { id: true },
    });
    if (!found)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_slug",
      });
    return found.id;
  }
  return null; // optional
}

/* ========= GET /api/events (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();
    const q = qRaw.length ? qRaw : undefined; // only build OR when present

    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));

    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort")); // e.g. start_at:asc
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const includeCategory = searchParams.get("include_category") === "1";

    const is_published = toBool(searchParams.get("is_published"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = (searchParams.get("status") || "").toLowerCase(); // done|upcoming|ongoing

    const category_id = parseId(searchParams.get("category_id"));
    const category_slug = parseId(searchParams.get("category_slug"));

    const now = new Date();

    const textFilter = q ? { contains: q } : undefined; // MySQL is already case-insensitive on *_ci collations

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
      // pastikan ada terjemahan di salah satu locale
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

    // hitung tiket terjual
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

    // upload banner jika ada, else pakai banner_url string
    let banner_url = "";
    if (file) {
      try {
        banner_url = await uploadEventBanner(file);
      } catch (e) {
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return json(
            {
              error: {
                code: "CONFIG_ERROR",
                message: "Konfigurasi bucket Supabase belum disetel.",
              },
            },
            { status: 500 }
          );
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

    // Translations
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

    // auto-translate ke EN
    let title_en = String(body?.title_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";
    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    if (autoTranslate) {
      if (!title_en && title_id)
        title_en = await translate(title_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const id = randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.events.create({
        data: {
          id,
          admin_users: { connect: { id: adminId } },
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
    if (err instanceof Response) return err;
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
