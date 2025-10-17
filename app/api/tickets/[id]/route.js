// app/api/tickets/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { sendTicketEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========== Helpers ========== */
function toInt(v, def = null) {
  if (v === "" || v === undefined || v === null) return def;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
function toDate(v) {
  if (!v && v !== 0) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, session };
}
function originFromReq(req) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
/** Baca body dari JSON / form-data / urlencoded */
async function readBody(req) {
  const type = (req.headers.get("content-type") || "").toLowerCase();
  if (
    type.includes("multipart/form-data") ||
    type.includes("application/x-www-form-urlencoded")
  ) {
    try {
      const fd = await req.formData();
      const obj = {};
      for (const [k, v] of fd.entries()) obj[k] = typeof v === "string" ? v : v;
      return obj;
    } catch {}
  }
  if (type.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  try {
    const fd = await req.formData();
    const obj = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") obj[k] = v;
    return obj;
  } catch {}
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/* ================================
   GET /api/tickets/[id]  (admin only)
   (hapus assertAdmin() jika ingin public)
================================== */
export async function GET(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const ticket = await prisma.tickets.findUnique({
      where: { id },
      include: {
        events: {
          select: {
            id: true,
            start_at: true,
            end_at: true,
            location: true,
            events_translate: {
              where: { locale: { in: ["id", "en"] } },
              select: { locale: true, title: true },
            },
          },
        },
      },
    });

    if (!ticket || ticket.deleted_at) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const eventTitle =
      ticket.events?.events_translate?.find((t) => t.locale === "id")?.title ??
      ticket.events?.events_translate?.find((t) => t.locale === "en")?.title ??
      "Event";

    return NextResponse.json({
      ...ticket,
      event_title: eventTitle,
    });
  } catch (err) {
    if (err?.status) return err;
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json(
      { message: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

/* ================================
   PATCH /api/tickets/[id]  (admin only)
   Body (form-data/JSON):
     status, payment_method, payment_reference, total_price, paid_at, expires_at, action=resend
================================== */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const b = await readBody(req);

    const updated = await prisma.tickets.update({
      where: { id },
      data: {
        ...(b.status !== undefined && {
          status: String(b.status).toUpperCase(),
        }),
        ...(b.payment_method !== undefined && {
          payment_method: b.payment_method,
        }),
        ...(b.payment_reference !== undefined && {
          payment_reference: b.payment_reference,
        }),
        ...(b.total_price !== undefined && {
          total_price: toInt(b.total_price, 0),
        }),
        ...(b.paid_at !== undefined && { paid_at: toDate(b.paid_at) }),
        ...(b.expires_at !== undefined && { expires_at: toDate(b.expires_at) }),
        updated_at: new Date(),
      },
    });

    // resend email optional
    if (String(b?.action || "").toLowerCase() === "resend") {
      try {
        const base = (
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.APP_URL ||
          process.env.NEXTAUTH_URL ||
          originFromReq(req)
        ).replace(/\/+$/, "");

        const ev = await prisma.events.findUnique({
          where: { id: updated.event_id },
          select: {
            id: true,
            start_at: true,
            end_at: true,
            location: true,
            events_translate: {
              where: { locale: { in: ["id", "en"] } },
              select: { locale: true, title: true },
            },
          },
        });

        const eventTitle =
          ev?.events_translate?.find((t) => t.locale === "id")?.title ??
          ev?.events_translate?.find((t) => t.locale === "en")?.title ??
          "Event";

        const qr_url = `${base}/api/tickets/qr?code=${encodeURIComponent(
          updated.ticket_code
        )}`;

        await sendTicketEmail({
          to: updated.email,
          full_name: updated.full_name,
          event: {
            title: eventTitle,
            start_at: ev?.start_at,
            end_at: ev?.end_at,
            location: ev?.location,
            organizer: "Panitia Penyelenggara",
            timezone: "Asia/Makassar",
          },
          ticket_code: updated.ticket_code,
          qr_url,
          logo_url: process.env.LOGO_URL,
          is_paid: updated.status === "CONFIRMED" || Boolean(updated.paid_at),
          support_email: process.env.SUPPORT_EMAIL,
          breakGmailThread: process.env.NODE_ENV !== "production",
        });
      } catch (e) {
        console.error("resend email failed:", e);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err?.status) return err;
    console.error("PATCH /api/tickets/[id] error:", err);
    return NextResponse.json(
      { message: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

/* ================================
   DELETE /api/tickets/[id]  (admin only, soft delete)
================================== */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.tickets.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json({ message: "deleted", data: deleted });
  } catch (err) {
    if (err?.status) return err;
    console.error("DELETE /api/tickets/[id] error:", err);
    return NextResponse.json(
      { message: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
