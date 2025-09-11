// app/api/tickets/checkin/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ========= Simple in-memory rate limiter (per instance) ========= */
const WINDOW_MS = 10_000; // 10s
const MAX_REQS = 30; // per IP
const bucket = new Map();
function ipFrom(req) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}
function rateLimit(req) {
  const ip = ipFrom(req);
  const now = Date.now();
  const rec = bucket.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + WINDOW_MS;
  }
  rec.count++;
  bucket.set(ip, rec);
  const allowed = rec.count <= MAX_REQS;
  const headers = {
    "X-RateLimit-Limit": String(MAX_REQS),
    "X-RateLimit-Remaining": String(Math.max(0, MAX_REQS - rec.count)),
    "X-RateLimit-Reset": String(Math.ceil(rec.reset / 1000)),
  };
  return { allowed, headers };
}

/* ========= Auth helper ========= */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id };
}

/* ========= Parse helper ========= */
function pickCode(url, body) {
  const q = url.searchParams.get("code");
  if (q) return q.trim().toUpperCase();
  if (body?.code) return String(body.code).trim().toUpperCase();
  if (body?.text) return String(body.text).trim().toUpperCase();
  return "";
}

/* ==============================================================
   POST /api/tickets/checkin
   Body/Query: { code: "EVT-XXXX-XXXX" } atau URL ?code=
   - Auth admin
   - Atomic update: check-in hanya jika CONFIRMED & NOT_CHECKED_IN
   - Insert log di ticket_checkin_logs saat sukses
================================================================ */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin();

    const { allowed, headers } = rateLimit(req);
    if (!allowed) {
      return NextResponse.json(
        { message: "Rate limit exceeded" },
        { status: 429, headers }
      );
    }

    const url = new URL(req.url);
    let body = null;
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json().catch(() => null);
    }

    let code = pickCode(url, body);
    const m = code.match(/EVT-[A-Z0-9]{4,}-[A-Z0-9]{3,}/i);
    if (m) code = m[0].toUpperCase();

    if (!code) {
      return NextResponse.json(
        { message: "code is required" },
        { status: 400, headers }
      );
    }

    // 1) Atomic check-in
    const updateRes = await prisma.tickets.updateMany({
      where: {
        deleted_at: null,
        ticket_code: code,
        status: "CONFIRMED",
        checkin_status: "NOT_CHECKED_IN",
      },
      data: {
        checkin_status: "CHECKED_IN",
        checked_in_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (updateRes.count === 1) {
      // 2) Ambil ticket & event, lalu catat log
      const [updated, event] = await Promise.all([
        prisma.tickets.findUnique({
          where: { ticket_code: code },
          select: {
            id: true,
            event_id: true,
            full_name: true,
            email: true,
            ticket_code: true,
            checkin_status: true,
            checked_in_at: true,
          },
        }),
        prisma.events.findFirst({
          where: { tickets: { some: { ticket_code: code } } },
          select: {
            id: true,
            title: true,
            start_at: true,
            end_at: true,
            location: true,
          },
        }),
      ]);

      // log (best-effort, jangan ganggu response kalau gagal)
      prisma.ticket_checkin_logs
        .create({
          data: { ticket_id: updated.id, admin_id: adminId },
        })
        .catch(() => {});

      return NextResponse.json(
        { message: "CHECKED_IN", data: { ticket: updated, event } },
        { status: 200, headers }
      );
    }

    // Diagnostik jika tidak ada baris yang ter-update
    const ticket = await prisma.tickets.findFirst({
      where: { deleted_at: null, ticket_code: code },
      select: {
        id: true,
        event_id: true,
        full_name: true,
        email: true,
        ticket_code: true,
        status: true,
        checkin_status: true,
        checked_in_at: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404, headers }
      );
    }

    if (ticket.status !== "CONFIRMED") {
      return NextResponse.json(
        { message: "Ticket is not confirmed (unpaid/pending/cancelled)" },
        { status: 400, headers }
      );
    }

    if (ticket.checkin_status === "CHECKED_IN") {
      const event = await prisma.events.findUnique({
        where: { id: ticket.event_id },
        select: { id: true, title: true },
      });
      return NextResponse.json(
        { message: "Ticket already checked in", data: { ticket, event } },
        { status: 409, headers }
      );
    }

    return NextResponse.json(
      { message: "Failed to check-in" },
      { status: 500, headers }
    );
  } catch (err) {
    if (err?.status) return err;
    console.error("POST /api/tickets/checkin error:", err);
    return NextResponse.json(
      { message: "Failed to check-in" },
      { status: 500 }
    );
  }
}
