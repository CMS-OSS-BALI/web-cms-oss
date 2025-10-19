// app/api/tickets/checkin/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { generateCertificateFront } from "@/lib/certificate/generateCertificateFront";
import { sendCertificateEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ⬅️ penting: hindari Edge runtime

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
    throw new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin)
    throw new Response(JSON.stringify({ message: "Forbidden" }), {
      status: 403,
    });
  return { adminId: admin.id };
}

/* ========= Parse helpers ========= */
function pickCode(url, body) {
  const q = url.searchParams.get("code");
  if (q) return q.trim().toUpperCase();
  if (body?.code) return String(body.code).trim().toUpperCase();
  if (body?.text) return String(body.text).trim().toUpperCase();
  return "";
}
function pickResend(url, body) {
  const v = url.searchParams.get("resend") ?? body?.resend;
  if (v === undefined || v === null) return 0;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" ? 1 : 0;
}

/* ========= Event title (dari events_translate) ========= */
async function getEventTitle(event_id) {
  if (!event_id) return "Event";
  const tr = await prisma.events_translate.findFirst({
    where: { id_events: event_id },
    orderBy: { created_at: "asc" },
    select: { title: true },
  });
  return tr?.title || "Event";
}

/* ========= Nomor sertifikat sederhana ========= */
function buildCertificateNo(eventId, ticketCode) {
  return `EVT/${String(eventId || "")
    .slice(0, 4)
    .toUpperCase()}/${String(ticketCode || "")
    .slice(-4)
    .toUpperCase()}/${new Date().getFullYear()}`;
}

/* ========= Kirim sertifikat helper (tidak melempar error) ========= */
async function sendCertificate({ ticket }) {
  if (!ticket?.email) {
    return { ok: false, status: 422, error: "Ticket has no email" };
  }
  try {
    const title = await getEventTitle(ticket.event_id);
    const noCertificate = buildCertificateNo(
      ticket.event_id,
      ticket.ticket_code
    );

    const pdfBuffer = await generateCertificateFront({
      fullName: ticket.full_name,
      noCertificate,
      templateImagePathFront:
        process.env.CCERT_FRONT_URL || process.env.CERT_FRONT_URL, // bebas, generator sudah punya fallback ke public/
    });

    await sendCertificateEmail({
      to: ticket.email,
      full_name: ticket.full_name,
      event_title: title,
      no_certificate: noCertificate,
      pdfBuffer,
    });

    return { ok: true, noCertificate, title };
  } catch (e) {
    console.error("[CERT] send certificate error:", e);
    return { ok: false, error: e?.message || "Failed to send certificate" };
  }
}

/* ==============================================================
   POST /api/tickets/checkin
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
    const resend = pickResend(url, body);

    // normalisasi format code (opsional regex)
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
      // 2) Ambil ticket setelah update & catat log
      const ticket = await prisma.tickets.findUnique({
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
      });

      // log (best-effort)
      prisma.ticket_checkin_logs
        .create({ data: { ticket_id: ticket.id, admin_id: adminId } })
        .catch(() => {});

      // 3) Generate & kirim sertifikat — tidak menggagalkan check-in bila gagal
      const meta = await sendCertificate({ ticket });

      if (meta.ok) {
        return NextResponse.json(
          {
            message: "CHECKED_IN & SENT",
            data: {
              ticket,
              no_certificate: meta.noCertificate,
              event_title: meta.title,
              certificate_sent: true,
            },
          },
          { status: 200, headers }
        );
      } else {
        return NextResponse.json(
          {
            message: "CHECKED_IN (certificate failed to send)",
            data: {
              ticket,
              certificate_sent: false,
              error: meta.error || meta.status,
            },
          },
          { status: 200, headers }
        );
      }
    }

    // Tidak ada baris ter-update → cek status tiket
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
      if (resend) {
        const meta = await sendCertificate({ ticket });
        return NextResponse.json(
          {
            message: meta.ok ? "RESENT" : "RESEND_FAILED",
            data: {
              ticket,
              certificate_sent: !!meta.ok,
              ...(meta.ok
                ? {
                    no_certificate: meta.noCertificate,
                    event_title: meta.title,
                  }
                : { error: meta.error }),
            },
          },
          { status: 200, headers }
        );
      }

      return NextResponse.json(
        { message: "Ticket already checked in", data: { ticket } },
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
