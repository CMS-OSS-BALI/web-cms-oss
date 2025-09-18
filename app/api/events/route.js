import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

function toBool(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}
function toInt(v, defaultVal = null) {
  if (v === "" || v === undefined || v === null) return defaultVal;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : defaultVal;
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
function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(trans = [], primary = DEFAULT_LOCALE, fallback = DEFAULT_LOCALE) {
  const by = (loc) => trans.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Response("Unauthorized", { status: 401 });

  if (session.user.role && String(session.user.role).toUpperCase() === "ADMIN") {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!admin) throw new Response("Forbidden", { status: 403 });
    return { session, adminId: admin.id };
  }
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { session, adminId: admin.id };
}

function mapEvent(row, locale, fallback, soldMap, nowMs) {
  const translation = pickTrans(row.events_translate || [], locale, fallback);
  const sold = Number(soldMap[row.id] || 0);
  const remaining = row.capacity == null ? null : Math.max(0, Number(row.capacity) - sold);
  const endMs = row?.end_at ? new Date(row.end_at).getTime() : null;
  const status = endMs != null && Number.isFinite(endMs) && endMs < nowMs ? "done" : undefined;

  return {
    id: row.id,
    admin_user_id: row.admin_user_id,
    start_at: row.start_at,
    end_at: row.end_at,
    location: row.location,
    banner_url: row.banner_url,
    is_published: row.is_published,
    capacity: row.capacity,
    pricing_type: row.pricing_type,
    ticket_price: row.ticket_price,
    created_at: row.created_at,
    updated_at: row.updated_at,
    locale_used: translation?.locale || null,
    title: translation?.title || null,
    description: translation?.description || null,
    sold,
    remaining,
    ...(status ? { status } : {}),
  };
}

/* ================== GET /api/events (public) ================== */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage") || 10)));
    const q = (searchParams.get("q") || "").trim();
    const isPublished = toBool(searchParams.get("is_published"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sort = searchParams.get("sort") || "latest";
    const statusFilter = (searchParams.get("status") || "").toLowerCase();
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || DEFAULT_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = { deleted_at: null };
    if (typeof isPublished === "boolean") where.is_published = isPublished;

    const and = [];
    if (from) {
      const d = toDate(from);
      if (d) and.push({ start_at: { gte: d } });
    }
    if (to) {
      const d = toDate(to);
      if (d) and.push({ end_at: { lte: d } });
    }
    if (statusFilter === "done") {
      and.push({ end_at: { lt: new Date() } });
    }
    if (q) {
      and.push({
        OR: [
          { location: { contains: q, mode: "insensitive" } },
          {
            events_translate: {
              some: {
                locale: { in: locales },
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }
    if (and.length) where.AND = and;
    where.events_translate = { some: { locale: { in: locales } } };

    let orderBy = { created_at: "asc" };
    if (sort === "latest") orderBy = { created_at: "desc" };
    else if (sort === "start_asc") orderBy = { start_at: "asc" };
    else if (sort === "start_desc") orderBy = { start_at: "desc" };

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
          created_at: true,
          updated_at: true,
          events_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, title: true, description: true },
          },
        },
      }),
    ]);

    const ids = rows.map((e) => e.id);
    let soldMap = {};
    if (ids.length) {
      const soldAgg = await prisma.tickets.groupBy({
        by: ["event_id"],
        where: {
          event_id: { in: ids },
          status: "CONFIRMED",
          deleted_at: null,
        },
        _count: { id: true },
      });
      soldMap = Object.fromEntries(soldAgg.map((r) => [r.event_id, r._count.id]));
    }

    const nowMs = Date.now();
    const data = rows.map((row) => mapEvent(row, locale, fallback, soldMap, nowMs));

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    console.error("GET /api/events error:", err);
    return NextResponse.json(
      { message: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

/* ================== POST /api/events (admin) ================== */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin();

    const body = await req.json().catch(() => ({}));
    const locale = normalizeLocale(body.locale);
    const title = (body?.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { message: "title is required" },
        { status: 400 }
      );
    }

    const startAt = toDate(body?.start_at);
    const endAt = toDate(body?.end_at);
    if (!startAt || !endAt) {
      return NextResponse.json(
        { message: "start_at and end_at are required" },
        { status: 400 }
      );
    }
    if (endAt < startAt) {
      return NextResponse.json(
        { message: "end_at must be >= start_at" },
        { status: 400 }
      );
    }

    const pricingType = normPricingType(body?.pricing_type);
    const rawPrice = pricingType === "PAID" ? toInt(body?.ticket_price, 0) : 0;
    if (pricingType === "PAID" && (!Number.isFinite(rawPrice) || rawPrice < 1)) {
      return NextResponse.json(
        { message: "ticket_price must be >= 1 for PAID events" },
        { status: 400 }
      );
    }

    const location = (body?.location || "").trim();
    if (!location) {
      return NextResponse.json(
        { message: "location is required" },
        { status: 400 }
      );
    }

    const ownerId = body?.admin_user_id || adminId;

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.events.create({
        data: {
          id: randomUUID(),
          admin_user_id: ownerId,
          start_at: startAt,
          end_at: endAt,
          location,
          banner_url: body?.banner_url ?? null,
          is_published:
            typeof body?.is_published === "boolean"
              ? body.is_published
              : !!toBool(body?.is_published),
          capacity: toInt(body?.capacity, null),
          pricing_type: pricingType,
          ticket_price: pricingType === "PAID" ? rawPrice : 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const description =
        body?.description !== undefined && body.description !== null
          ? String(body.description)
          : null;

      await tx.events_translate.create({
        data: {
          id_events: created.id,
          locale,
          title,
          description,
        },
      });

      if (locale !== EN_LOCALE && (title || description)) {
        const [titleEn, descEn] = await Promise.all([
          title ? translate(title, locale, EN_LOCALE) : Promise.resolve(title),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.events_translate.upsert({
          where: {
            id_events_locale: { id_events: created.id, locale: EN_LOCALE },
          },
          update: {
            ...(titleEn ? { title: titleEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_events: created.id,
            locale: EN_LOCALE,
            title: titleEn || title,
            description: descEn ?? description,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ id: result.id, locale, title }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/events error:", err);
    return NextResponse.json(
      { message: "Failed to create event" },
      { status: 500 }
    );
  }
}
