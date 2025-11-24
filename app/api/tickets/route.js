// app/api/tickets/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { sendTicketEmail } from "@/lib/mailer";
import { randomUUID } from "crypto";
import {
  consumeRateLimitDistributed,
  rateLimitHeaders,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ================= Helpers ================= */
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
function newTicketCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/I/1
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function originFromReq(req) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
function clientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Baca body baik dari JSON maupun (multipart/form-data|x-www-form-urlencoded) */
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
    } catch {
      /* fallback ke JSON */
    }
  }

  if (type.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }

  // Fallback: coba formData → JSON (untuk klien yg salah set header)
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("perPage") || 20))
    );

    const locale = (searchParams.get("locale") || "id")
      .slice(0, 5)
      .toLowerCase();
    const fallback = (
      searchParams.get("fallback") || (locale === "id" ? "en" : "id")
    )
      .slice(0, 5)
      .toLowerCase();
    const locales = Array.from(new Set([locale, fallback].filter(Boolean)));

    const event_id = (searchParams.get("event_id") || "").trim() || undefined;
    const status = searchParams.get("status") || undefined; // PENDING|CONFIRMED|CANCELLED
    const checkin_status = searchParams.get("checkin_status") || undefined; // NOT_CHECKED_IN|CHECKED_IN
    const q = (searchParams.get("q") || "").trim();

    // WHERE dasar
    const where = { deleted_at: null };
    if (event_id) where.event_id = event_id;
    if (status) where.status = status;
    if (checkin_status) where.checkin_status = checkin_status;

    if (q) {
      // Cari: nama, email, WA, code, DAN judul event
      where.OR = [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { whatsapp: { contains: q } },
        { ticket_code: { contains: q } },
        {
          events: {
            events_translate: {
              some: {
                locale: { in: locales },
                title: { contains: q },
              },
            },
          },
        },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.tickets.count({ where }),
      prisma.tickets.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          event_id: true,
          full_name: true,
          email: true,
          whatsapp: true,
          ticket_code: true,
          status: true,
          expires_at: true,
          checkin_status: true,
          created_at: true,
          updated_at: true,
          events: {
            select: {
              events_translate: {
                where: { locale: { in: locales } },
                select: { locale: true, title: true },
              },
            },
          },
        },
      }),
    ]);

    // Ambil judul by locale→fallback
    const data = rows.map((r) => {
      const tr = r.events?.events_translate || [];
      const by = (loc) => tr.find((t) => t.locale === loc)?.title || null;
      const title = by(locale) || by(fallback) || null;
      const { events, ...rest } = r;
      return { ...rest, event_title: title };
    });

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      data,
    });
  } catch (err) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json(
      { message: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

/* ====================================================
   POST /api/tickets (form-data/JSON)
   Fields:
     event_id*, full_name*, email*, whatsapp?, school_or_campus?, class_or_semester?, domicile?
     (PAID opsional): payment_method, payment_reference
==================================================== */
export async function POST(req) {
  try {
    // publik boleh POST; batasi admin jika perlu → await assertAdmin();

    const b = await readBody(req);
    const honeypot =
      b?.hp || b?.honeypot || b?.website || b?.url || b?.company || "";
    if (honeypot) {
      return NextResponse.json({ message: "OK" });
    }

    const ip = clientIp(req);
    const emailNormalized =
      typeof b?.email === "string" ? b.email.toLowerCase().trim() : "none";
    const limits = await Promise.all([
      consumeRateLimitDistributed(`tickets:ip:${ip}`, {
        limit: 30,
        windowMs: 60_000,
      }),
      consumeRateLimitDistributed(`tickets:email:${emailNormalized}`, {
        limit: 8,
        windowMs: 60_000,
      }),
    ]);
    const blocked = limits.find((m) => !m.success);
    if (blocked) {
      return NextResponse.json(
        { message: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429, headers: rateLimitHeaders(blocked) }
      );
    }

    const event_id = (b?.event_id ?? "").toString().trim();
    const full_name = (b?.full_name ?? "").toString().trim();
    const email = (b?.email ?? "").toString().trim().toLowerCase();
    const whatsapp = b?.whatsapp != null ? b.whatsapp.toString().trim() : null;
    const school_or_campus = b?.school_or_campus ?? null;
    const class_or_semester = b?.class_or_semester ?? null;
    const domicile = b?.domicile ?? null;

    if (!event_id || !full_name || !email) {
      return NextResponse.json(
        { message: "event_id, full_name, email are required" },
        { status: 400 }
      );
    }

    // Ambil event (judul via events_translate)
    const event = await prisma.events.findFirst({
      where: { id: event_id, deleted_at: null, is_published: true },
      select: {
        id: true,
        start_at: true,
        end_at: true,
        location: true,
        capacity: true,
        pricing_type: true, // FREE | PAID
        ticket_price: true,
        events_translate: {
          where: { locale: { in: ["id", "en"] } },
          select: { locale: true, title: true },
        },
      },
    });
    if (!event) {
      return NextResponse.json(
        { message: "Event not found or not published" },
        { status: 404 }
      );
    }
    const eventTitle =
      event.events_translate?.find((t) => t.locale === "id")?.title ??
      event.events_translate?.find((t) => t.locale === "en")?.title ??
      "Event";

    // Cek dobel (unik event_id+email, PENDING/CONFIRMED)
    const exists = await prisma.tickets.findFirst({
      where: {
        deleted_at: null,
        event_id,
        email,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        {
          message:
            "Anda sudah terdaftar untuk event ini (maksimal 1 tiket per email).",
        },
        { status: 409 }
      );
    }

    // Cek kapasitas
    if (typeof event.capacity === "number") {
      const statuses =
        event.pricing_type === "FREE"
          ? ["CONFIRMED"]
          : ["PENDING", "CONFIRMED"];
      const usedForCapacity = await prisma.tickets.count({
        where: {
          event_id: event.id,
          status: { in: statuses },
          deleted_at: null,
        },
      });
      if (usedForCapacity >= event.capacity) {
        return NextResponse.json(
          { message: "Tiket SOLD OUT" },
          { status: 400 }
        );
      }
    }

    // Tipe event
    const isPaid = event.pricing_type === "PAID";
    const status = isPaid ? "PENDING" : "CONFIRMED";
    const total_price = isPaid ? Number(event.ticket_price || 0) : 0;

    // Kode tiket & URL QR
    const code = `EVT-${newTicketCode(6)}-${newTicketCode(4)}`;
    const base = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      originFromReq(req)
    ).replace(/\/+$/, "");
    const qr_url = `${base}/api/tickets/qr?code=${encodeURIComponent(code)}`;

    const created = await prisma.tickets.create({
      data: {
        id: randomUUID(),
        event_id,
        full_name,
        email,
        whatsapp,
        school_or_campus,
        class_or_semester,
        domicile,
        ticket_code: code,
        qr_url,
        status, // PENDING|CONFIRMED|CANCELLED
        total_price,
        payment_method: isPaid ? b?.payment_method ?? null : null,
        payment_reference: isPaid ? b?.payment_reference ?? null : null,
        paid_at: isPaid ? null : new Date(), // FREE dianggap paid now
        expires_at: null,

        checkin_status: "NOT_CHECKED_IN",
        checked_in_at: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Kirim email tiket (template QR-only)
    try {
      await sendTicketEmail({
        to: email,
        full_name,
        event: {
          title: eventTitle,
          start_at: event.start_at,
          end_at: event.end_at,
          location: event.location,
          organizer: "Panitia Penyelenggara",
          timezone: "Asia/Makassar",
        },
        ticket_code: code,
        qr_url,
        logo_url: process.env.LOGO_URL,
        is_paid: !isPaid,
        support_email: process.env.SUPPORT_EMAIL,
        breakGmailThread: process.env.NODE_ENV !== "production",
      });
    } catch (e) {
      console.error("[MAILER] sendTicketEmail error:", e?.message || e);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { message: "Email ini sudah terdaftar di event ini." },
        { status: 409 }
      );
    }
    if (err?.status) return err;
    console.error("POST /api/tickets error:", err);
    return NextResponse.json(
      { message: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

/* ====================================================
   PATCH /api/tickets?id=<uuid>
   Form-Data / JSON accepted:
     status, payment_method, payment_reference, total_price, paid_at, expires_at, action=resend
==================================================== */
export async function PATCH(req) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
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

    if (String(b?.action || "").toLowerCase() === "resend") {
      try {
        const base = (
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.APP_URL ||
          process.env.NEXTAUTH_URL ||
          originFromReq(req)
        ).replace(/\/+$/, "");
        const event = await prisma.events.findUnique({
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
          event?.events_translate?.find((t) => t.locale === "id")?.title ??
          event?.events_translate?.find((t) => t.locale === "en")?.title ??
          "Event";

        const qr_url = `${base}/api/tickets/qr?code=${encodeURIComponent(
          updated.ticket_code
        )}`;

        await sendTicketEmail({
          to: updated.email,
          full_name: updated.full_name,
          event: {
            title: eventTitle,
            start_at: event?.start_at,
            end_at: event?.end_at,
            location: event?.location,
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
    console.error("PATCH /api/tickets error:", err);
    return NextResponse.json(
      { message: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

/* ====================================================
   DELETE /api/tickets?id=<uuid>  (soft delete)
==================================================== */
export async function DELETE(req) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.tickets.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json({ message: "deleted", data: deleted });
  } catch (err) {
    if (err?.status) return err;
    console.error("DELETE /api/tickets error:", err);
    return NextResponse.json(
      { message: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
