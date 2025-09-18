import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
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

/* ================== GET /api/events/:id (public) ================== */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || DEFAULT_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.events.findFirst({
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
        events_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, title: true, description: true },
        },
      },
    });

    if (!row) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const sold = await prisma.tickets.count({
      where: { event_id: id, status: "CONFIRMED", deleted_at: null },
    });
    const remaining = row.capacity == null ? null : Math.max(0, Number(row.capacity) - sold);
    const translation = pickTrans(row.events_translate || [], locale, fallback);

    const data = {
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
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error(`GET /api/events/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

/* ================== PATCH /api/events/:id (admin) ================== */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const locale = normalizeLocale(body.locale);

    const current = await prisma.events.findUnique({
      where: { id },
      select: {
        start_at: true,
        end_at: true,
        capacity: true,
        pricing_type: true,
        ticket_price: true,
      },
    });
    if (!current) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const data = {};
    let startCandidate = current.start_at;
    let endCandidate = current.end_at;

    if (body.start_at !== undefined) {
      const newStart = toDate(body.start_at);
      if (!newStart) {
        return NextResponse.json({ message: "Invalid start_at" }, { status: 400 });
      }
      data.start_at = newStart;
      startCandidate = newStart;
    }
    if (body.end_at !== undefined) {
      const newEnd = toDate(body.end_at);
      if (!newEnd) {
        return NextResponse.json({ message: "Invalid end_at" }, { status: 400 });
      }
      data.end_at = newEnd;
      endCandidate = newEnd;
    }
    if (endCandidate < startCandidate) {
      return NextResponse.json(
        { message: "end_at must be >= start_at" },
        { status: 400 }
      );
    }

    if (body.location !== undefined) data.location = String(body.location).trim();
    if (body.banner_url !== undefined) data.banner_url = body.banner_url ?? null;

    if (body.is_published !== undefined) {
      data.is_published =
        typeof body.is_published === "boolean"
          ? body.is_published
          : !!toBool(body.is_published);
    }

    if (body.capacity !== undefined) {
      const capacity = toInt(body.capacity, null);
      if (capacity != null) {
        const soldCount = await prisma.tickets.count({
          where: { event_id: id, status: "CONFIRMED", deleted_at: null },
        });
        if (capacity < soldCount) {
          return NextResponse.json(
            { message: `capacity cannot be less than current sold (${soldCount})` },
            { status: 400 }
          );
        }
      }
      data.capacity = capacity;
    }

    if (body.pricing_type !== undefined) {
      data.pricing_type = normPricingType(body.pricing_type);
    }

    if (body.ticket_price !== undefined) {
      const pricing = data.pricing_type || current.pricing_type;
      if (pricing === "PAID") {
        const priceCandidate = toInt(body.ticket_price, 0);
        if (!Number.isFinite(priceCandidate) || priceCandidate < 1) {
          return NextResponse.json(
            { message: "ticket_price must be >= 1 for PAID events" },
            { status: 400 }
          );
        }
        data.ticket_price = priceCandidate;
      } else {
        data.ticket_price = 0;
      }
    } else if ((data.pricing_type || current.pricing_type) === "FREE") {
      data.ticket_price = 0;
    }

    if (Object.keys(data).length) {
      data.updated_at = new Date();
    }

    const hasTitle = body.title !== undefined;
    const hasDescription = body.description !== undefined;
    if (hasTitle) {
      const trimmed = String(body.title || "").trim();
      if (!trimmed) {
        return NextResponse.json({ message: "title is required" }, { status: 400 });
      }
      body.title = trimmed;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.events.update({ where: { id }, data });
      }

      if (hasTitle || hasDescription) {
        const translationUpdate = {};
        if (hasTitle) translationUpdate.title = body.title;
        if (hasDescription) {
          translationUpdate.description =
            body.description === null ? null : String(body.description);
        }

        await tx.events_translate.upsert({
          where: { id_events_locale: { id_events: id, locale } },
          update: translationUpdate,
          create: {
            id_events: id,
            locale,
            title: translationUpdate.title || body.title || "",
            description:
              translationUpdate.description !== undefined
                ? translationUpdate.description
                : null,
          },
        });

        if (locale !== EN_LOCALE && (hasTitle || hasDescription)) {
          const sourceTitle = hasTitle ? body.title : undefined;
          const sourceDesc = hasDescription ? translationUpdate.description : undefined;

          const [titleEn, descEn] = await Promise.all([
            sourceTitle
              ? translate(sourceTitle, locale, EN_LOCALE)
              : Promise.resolve(undefined),
            typeof sourceDesc === "string"
              ? translate(sourceDesc, locale, EN_LOCALE)
              : Promise.resolve(sourceDesc),
          ]);

          const enUpdate = {};
          if (sourceTitle !== undefined) enUpdate.title = titleEn || sourceTitle;
          if (sourceDesc !== undefined) enUpdate.description = descEn ?? sourceDesc ?? null;

          if (Object.keys(enUpdate).length) {
            await tx.events_translate.upsert({
              where: { id_events_locale: { id_events: id, locale: EN_LOCALE } },
              update: enUpdate,
              create: {
                id_events: id,
                locale: EN_LOCALE,
                title: enUpdate.title || body.title,
                description:
                  enUpdate.description !== undefined
                    ? enUpdate.description
                    : sourceDesc ?? null,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`PATCH /api/events/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update event" },
      { status: 500 }
    );
  }
}

/* ================== DELETE /api/events/:id (soft delete, admin) ================== */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;

    const deleted = await prisma.events.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json({ message: "deleted", data: deleted });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`DELETE /api/events/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete event" },
      { status: 500 }
    );
  }
}
