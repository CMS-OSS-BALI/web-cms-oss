import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
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
function notFound() {
  return json(
    { error: { code: "NOT_FOUND", message: "Data event tidak ditemukan." } },
    { status: 404 }
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
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** session OR x-admin-key */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
    return anyAdmin;
  }
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return admin;
}

/** JSON / form-data → { body, file } */
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

/* ========= Supabase ========= */
async function uploadEventBanner(file) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
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

  return objectPath;
}

/* ========= Category helpers ========= */
async function resolveCategoryId({ category_id, category_slug }) {
  const byId = (v) => {
    const s = typeof v === "string" ? v.trim() : null;
    return s && s.length ? s : null;
  };
  const bySlug = byId(category_slug);
  const id = byId(category_id);
  if (id) {
    const exists = await prisma.event_categories.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists)
      throw Object.assign(new Error("CATEGORY_NOT_FOUND"), {
        field: "category_id",
      });
    return id;
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
  return null;
}

/* ========= GET /api/events/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", DEFAULT_LOCALE);
    const fallback = pickLocale(req, "fallback", DEFAULT_LOCALE);
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));
    const includeCategory =
      new URL(req.url).searchParams.get("include_category") === "1";

    const item = await prisma.events.findFirst({
      where: { id, deleted_at: null },
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
        created_at: true,
        updated_at: true,
        category_id: true,
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
    });
    if (!item) return notFound();

    const sold = await prisma.tickets.count({
      where: { event_id: id, status: "CONFIRMED", deleted_at: null },
    });
    const remaining =
      item.capacity == null ? null : Math.max(0, Number(item.capacity) - sold);

    const t = pickTrans(item.events_translate, locale, fallback);
    const created_ts = item?.created_at
      ? new Date(item.created_at).getTime()
      : null;
    const updated_ts = item?.updated_at
      ? new Date(item.updated_at).getTime()
      : null;
    const start_ts = item?.start_at ? new Date(item.start_at).getTime() : null;
    const end_ts = item?.end_at ? new Date(item.end_at).getTime() : null;

    const booth_remaining =
      item.booth_quota == null
        ? null
        : Math.max(
            0,
            Number(item.booth_quota) - Number(item.booth_sold_count || 0)
          );

    let category_name = null;
    let category_description = null;
    let category_locale_used = null;
    if (includeCategory && item.category?.translate) {
      const ct = pickTrans(item.category.translate, locale, fallback);
      category_name = ct?.name ?? null;
      category_description = ct?.description ?? null;
      category_locale_used = ct?.locale ?? null;
    }

    return json({
      message: "OK",
      data: {
        id: item.id,
        banner_url: toPublicUrl(item.banner_url),
        is_published: item.is_published,
        start_at: item.start_at,
        end_at: item.end_at,
        start_ts,
        end_ts,
        location: item.location,
        capacity: item.capacity,
        pricing_type: item.pricing_type,
        ticket_price: item.ticket_price,
        category_id: item.category?.id ?? null,
        category_slug: item.category?.slug ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts,
        updated_ts,
        title: t?.title ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
        sold,
        remaining,
        ...(includeCategory
          ? { category_name, category_description, category_locale_used }
          : {}),
        booth_price: item.booth_price,
        booth_quota: item.booth_quota,
        booth_sold_count: item.booth_sold_count,
        booth_remaining,
      },
    });
  } catch (err) {
    console.error(`GET /api/events/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail event. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/events/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);

    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const { body, file } = await readBodyAndFile(req);

    const current = await prisma.events.findUnique({
      where: { id },
      select: {
        id: true,
        start_at: true,
        end_at: true,
        pricing_type: true,
        booth_sold_count: true,
      },
    });
    if (!current) return notFound();

    const data = {};
    const ops = [];
    let title_id_new, desc_id_new;

    if (file) {
      try {
        data.banner_url = await uploadEventBanner(file);
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
    } else if ("banner_url" in body) {
      const v = String(body.banner_url || "").trim();
      if (v.length > 1024)
        return badRequest("banner_url maksimal 1024 karakter", "banner_url");
      data.banner_url = v || null;
    }

    if ("start_at" in body) {
      const newStart = toDate(body.start_at);
      if (!newStart) return badRequest("start_at tidak valid", "start_at");
      data.start_at = newStart;
    }
    if ("end_at" in body) {
      const newEnd = toDate(body.end_at);
      if (!newEnd) return badRequest("end_at tidak valid", "end_at");
      data.end_at = newEnd;
    }
    const startC = data.start_at || current.start_at;
    const endC = data.end_at || current.end_at;
    if (startC && endC && endC < startC)
      return badRequest("end_at harus >= start_at", "end_at");

    if ("location" in body) data.location = String(body.location || "").trim();
    if ("is_published" in body)
      data.is_published =
        typeof body.is_published === "boolean"
          ? body.is_published
          : !!toBool(body.is_published);

    if ("capacity" in body) {
      const cap = toInt(body.capacity, null);
      if (cap !== null && cap < 0)
        return badRequest("capacity harus >= 0 atau null.", "capacity");
      data.capacity = cap;
    }

    if ("pricing_type" in body)
      data.pricing_type = normPricingType(body.pricing_type);
    if ("ticket_price" in body) {
      const pricing = data.pricing_type || current.pricing_type;
      const priceCandidate = toInt(body.ticket_price, 0);
      if (pricing === "PAID") {
        if (!Number.isFinite(priceCandidate) || priceCandidate < 1)
          return badRequest(
            "ticket_price harus >= 1 untuk event berbayar (PAID)",
            "ticket_price"
          );
        data.ticket_price = priceCandidate;
      } else {
        data.ticket_price = 0;
      }
    } else if ((data.pricing_type || current.pricing_type) === "FREE") {
      data.ticket_price = 0;
    }

    // Booth fields
    if ("booth_price" in body) {
      const v = toInt(body.booth_price, 0);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("booth_price harus >= 0", "booth_price");
      data.booth_price = v;
    }
    if ("booth_quota" in body) {
      const raw = body.booth_quota;
      let v =
        raw === "" || raw === null || raw === undefined
          ? null
          : toInt(raw, null);
      if (v !== null && v < 0)
        return badRequest("booth_quota harus >= 0 atau null", "booth_quota");
      const soldNow = Number(current.booth_sold_count || 0);
      if (v !== null && v < soldNow)
        return badRequest(
          `booth_quota (${v}) tidak boleh lebih kecil dari booth_sold_count (${soldNow}).`,
          "booth_quota"
        );
      data.booth_quota = v;
    }

    // Translations (ID/EN) + optional auto-translate
    if ("title_id" in body || "description_id" in body) {
      title_id_new =
        "title_id" in body ? String(body.title_id || "") : undefined;
      desc_id_new =
        "description_id" in body
          ? String(body.description_id || "")
          : undefined;

      if (title_id_new !== undefined && !title_id_new.trim())
        return badRequest("title_id tidak boleh kosong.", "title_id");

      ops.push(
        prisma.events_translate.upsert({
          where: { id_events_locale: { id_events: id, locale: "id" } },
          update: {
            ...(title_id_new !== undefined
              ? { title: (title_id_new || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_id_new !== undefined
              ? { description: desc_id_new || null }
              : {}),
          },
          create: {
            id_events: id,
            locale: "id",
            title: (title_id_new || "(no title)").slice(0, 191),
            description: desc_id_new || null,
          },
        })
      );
    }

    if ("title_en" in body || "description_en" in body) {
      const title_en =
        "title_en" in body ? String(body.title_en || "") : undefined;
      const desc_en =
        "description_en" in body
          ? String(body.description_en || "")
          : undefined;

      ops.push(
        prisma.events_translate.upsert({
          where: { id_events_locale: { id_events: id, locale: "en" } },
          update: {
            ...(title_en !== undefined
              ? { title: (title_en || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_en !== undefined ? { description: desc_en || null } : {}),
          },
          create: {
            id_events: id,
            locale: "en",
            title: (title_en || "(no title)").slice(0, 191),
            description: desc_en || null,
          },
        })
      );
    }

    // Kategori (opsional)
    if ("category_id" in body || "category_slug" in body) {
      const catId =
        "category_id" in body ? String(body.category_id || "").trim() : null;
      const catSlug =
        "category_slug" in body
          ? String(body.category_slug || "").trim()
          : null;

      try {
        const resolved = await resolveCategoryId({
          category_id: catId,
          category_slug: catSlug,
        });
        if (resolved === null) data.category = { disconnect: true };
        else data.category = { connect: { id: resolved } };
      } catch (e) {
        if (e.message === "CATEGORY_NOT_FOUND")
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
        throw e;
      }
    }

    const autoTranslate = String(body?.autoTranslate ?? "false") === "true";

    if (Object.keys(data).length) data.updated_at = new Date();
    if (Object.keys(data).length) {
      await prisma.events.update({ where: { id }, data });
    } else {
      const exists = await prisma.events.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    // 🔧 BUGFIX: jalankan semua upsert terjemahan yang terkumpul
    if (ops.length) {
      await prisma.$transaction(ops);
    }

    if (autoTranslate && ("title_id" in body || "description_id" in body)) {
      const title_en_auto =
        "title_id" in body && body.title_id
          ? await translate(String(body.title_id), "id", "en")
          : undefined;
      const desc_en_auto =
        "description_id" in body
          ? await translate(String(body.description_id || ""), "id", "en")
          : undefined;

      if (title_en_auto !== undefined || desc_en_auto !== undefined) {
        await prisma.events_translate.upsert({
          where: { id_events_locale: { id_events: id, locale: "en" } },
          update: {
            ...(title_en_auto ? { title: title_en_auto.slice(0, 191) } : {}),
            ...(desc_en_auto !== undefined
              ? { description: desc_en_auto ?? null }
              : {}),
          },
          create: {
            id_events: id,
            locale: "en",
            title: (title_en_auto || "(no title)").slice(0, 191),
            description: desc_en_auto ?? null,
          },
        });
      }
    }

    const updated = await prisma.events.findUnique({
      where: { id },
      select: {
        id: true,
        banner_url: true,
        category_id: true,
        booth_price: true,
        booth_quota: true,
        booth_sold_count: true,
      },
    });

    // ambil judul (ID) terbaru untuk bantu UI sinkron
    const trId = await prisma.events_translate.findUnique({
      where: { id_events_locale: { id_events: id, locale: "id" } },
      select: { title: true },
    });

    const booth_remaining =
      updated?.booth_quota == null
        ? null
        : Math.max(
            0,
            Number(updated.booth_quota) - Number(updated.booth_sold_count || 0)
          );

    return json({
      message: "Event berhasil diperbarui.",
      data: {
        id: updated?.id || id,
        banner_url: toPublicUrl(updated?.banner_url ?? null),
        category_id: updated?.category_id ?? null,
        booth_price: updated?.booth_price ?? null,
        booth_quota: updated?.booth_quota ?? null,
        booth_sold_count: updated?.booth_sold_count ?? 0,
        booth_remaining,
        title_id: trId?.title ?? null,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/events/${params?.id} error:`, err);
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

/* ========= DELETE /api/events/:id ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.events.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({
      message: "Event berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/events/${params?.id} error:`, err);
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
