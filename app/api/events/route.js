// app/api/events/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/* ============== Helpers ============== */
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
  return isNaN(d.getTime()) ? null : d;
}
function normPricingType(v) {
  const s = String(v || "").toUpperCase();
  return s === "PAID" ? "PAID" : "FREE";
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });

  if (
    session.user.role &&
    String(session.user.role).toUpperCase() === "ADMIN"
  ) {
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

/* ================== GET /api/events (public) ================== */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("perPage") || 10))
    );
    const q = (searchParams.get("q") || "").trim();
    const isPublished = toBool(searchParams.get("is_published"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sort = searchParams.get("sort") || "latest";

    const where = { deleted_at: null };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }
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
    if (and.length) where.AND = and;

    let orderBy = { created_at: "asc" };
    if (sort === "latest") orderBy = { created_at: "desc" };
    else if (sort === "start_asc") orderBy = { start_at: "asc" };
    else if (sort === "start_desc") orderBy = { start_at: "desc" };

    const [total, baseData] = await Promise.all([
      prisma.events.count({ where }),
      prisma.events.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    // aggregator sold/remaining
    const ids = baseData.map((e) => e.id);
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

    const data = baseData.map((e) => {
      const sold = Number(soldMap[e.id] || 0);
      const remaining =
        e.capacity == null ? null : Math.max(0, Number(e.capacity) - sold);
      return { ...e, sold, remaining };
    });

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
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

    const b = await req.json();
    const title = (b?.title || "").trim();
    if (!title)
      return NextResponse.json(
        { message: "title is required" },
        { status: 400 }
      );

    const startAt = toDate(b?.start_at);
    const endAt = toDate(b?.end_at);
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

    const pricingType = normPricingType(b?.pricing_type);
    const rawPrice = pricingType === "PAID" ? toInt(b?.ticket_price, 0) : 0;
    if (
      pricingType === "PAID" &&
      (!Number.isFinite(rawPrice) || rawPrice < 1)
    ) {
      return NextResponse.json(
        { message: "ticket_price must be >= 1 for PAID events" },
        { status: 400 }
      );
    }

    const ownerId = b?.admin_user_id || adminId;

    const created = await prisma.events.create({
      data: {
        id: randomUUID(),
        title,
        description: b?.description ?? null,
        start_at: startAt,
        end_at: endAt,
        location: b?.location ?? null,
        banner_url: b?.banner_url ?? null,
        is_published:
          typeof b?.is_published === "boolean"
            ? b.is_published
            : !!toBool(b?.is_published),
        capacity: toInt(b?.capacity, 0),
        pricing_type: pricingType,
        ticket_price: pricingType === "PAID" ? rawPrice : 0,
        created_at: new Date(),
        updated_at: new Date(),
        admin_users: { connect: { id: ownerId } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err?.status) return err;
    console.error("POST /api/events error:", err);
    return NextResponse.json(
      { message: "Failed to create event" },
      { status: 500 }
    );
  }
}
