// app/api/events/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ============== Helpers (same as list) ============== */
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

/* ================== GET /api/events/:id (public) ================== */
export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    const e = await prisma.events.findFirst({
      where: { id, deleted_at: null },
    });
    if (!e) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const sold = await prisma.tickets.count({
      where: { event_id: id, status: "CONFIRMED", deleted_at: null },
    });
    const remaining =
      e.capacity == null ? null : Math.max(0, Number(e.capacity) - sold);

    return NextResponse.json({ ...e, sold, remaining });
  } catch (err) {
    console.error(`GET /api/events/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

/* ================== PATCH|PUT /api/events/:id (admin) ================== */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;

    const body = await req.json();

    // current for validation
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
    if (!current)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const newStart =
      body.start_at !== undefined ? toDate(body.start_at) : current.start_at;
    const newEnd =
      body.end_at !== undefined ? toDate(body.end_at) : current.end_at;
    if (!newStart || !newEnd) {
      return NextResponse.json(
        { message: "Invalid start_at or end_at" },
        { status: 400 }
      );
    }
    if (newEnd < newStart) {
      return NextResponse.json(
        { message: "end_at must be >= start_at" },
        { status: 400 }
      );
    }

    // pricing validation
    const pricingType =
      body.pricing_type !== undefined
        ? normPricingType(body.pricing_type)
        : current.pricing_type;

    const priceCandidate =
      pricingType === "PAID"
        ? toInt(
            body.ticket_price !== undefined
              ? body.ticket_price
              : current.ticket_price,
            0
          )
        : 0;

    if (
      pricingType === "PAID" &&
      (!Number.isFinite(priceCandidate) || priceCandidate < 1)
    ) {
      return NextResponse.json(
        { message: "ticket_price must be >= 1 for PAID events" },
        { status: 400 }
      );
    }

    // avoid capacity < sold
    let capacityToSet =
      body.capacity !== undefined ? toInt(body.capacity, 0) : current.capacity;

    if (capacityToSet != null) {
      const soldCount = await prisma.tickets.count({
        where: { event_id: id, status: "CONFIRMED", deleted_at: null },
      });
      if (capacityToSet < soldCount) {
        return NextResponse.json(
          {
            message: `capacity cannot be less than current sold (${soldCount})`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.events.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: String(body.title).trim() }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.start_at !== undefined && { start_at: newStart }),
        ...(body.end_at !== undefined && { end_at: newEnd }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.banner_url !== undefined && { banner_url: body.banner_url }),
        ...(body.is_published !== undefined && {
          is_published:
            typeof body.is_published === "boolean"
              ? body.is_published
              : !!toBool(body.is_published),
        }),
        ...(body.capacity !== undefined && { capacity: capacityToSet }),
        ...(body.pricing_type !== undefined && { pricing_type: pricingType }),
        ...(body.ticket_price !== undefined && {
          ticket_price: pricingType === "PAID" ? priceCandidate : 0,
        }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err?.status) return err;
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
    if (err?.status) return err;
    console.error(`DELETE /api/events/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete event" },
      { status: 500 }
    );
  }
}
