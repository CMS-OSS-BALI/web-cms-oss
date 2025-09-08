// app/api/tickets/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import transporter from "@/lib/mailer";
import QRCode from "qrcode";
import { randomUUID, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

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
  // Tanpa 0/O/I/1 agar mudah dibaca
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function originFromReq(req) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/* ====================================================
   GET /api/tickets?event_id=&q=&status=&checkin_status=&page=&perPage=
   q mencari di: full_name, email, whatsapp, ticket_code
==================================================== */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("perPage") || 20))
    );

    const event_id = searchParams.get("event_id") || undefined;
    const status = searchParams.get("status") || undefined; // PENDING|CONFIRMED|CANCELLED
    const checkin_status = searchParams.get("checkin_status") || undefined; // NOT_CHECKED_IN|CHECKED_IN
    const q = (searchParams.get("q") || "").trim();

    const where = { deleted_at: null };
    if (event_id) where.event_id = event_id;
    if (status) where.status = status;
    if (checkin_status) where.checkin_status = checkin_status;
    if (q) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { whatsapp: { contains: q, mode: "insensitive" } },
        { ticket_code: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.tickets.count({ where }),
      prisma.tickets.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

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
   POST /api/tickets
   Body (minimal):
     { event_id*, full_name*, email*, whatsapp?, school_or_campus?, class_or_semester?, domicile? }
   Aturan:
     - Maksimal 1 tiket per (event_id, email) yg masih aktif (PENDING/CONFIRMED)
     - FREE  -> status CONFIRMED + total_price 0 + cek kapasitas (CONFIRMED)
     - PAID  -> status PENDING + total_price = ticket_price (kapasitas dihitung PENDING+CONFIRMED)
     - checkin_status default: NOT_CHECKED_IN
     - generate ticket_code & qr_url (/api/tickets/qr?code=...)
     - kirim email berisi QR (inline image)
==================================================== */
export async function POST(req) {
  try {
    // Publik boleh pesan; kalau mau batasi admin saja, uncomment berikut:
    // await assertAdmin();

    const b = await req.json();
    const event_id = (b?.event_id || "").trim();
    const full_name = (b?.full_name || "").trim();
    const email = (b?.email || "").trim().toLowerCase();
    const whatsapp = b?.whatsapp?.toString().trim() || null;
    const school_or_campus = b?.school_or_campus ?? null;
    const class_or_semester = b?.class_or_semester ?? null;
    const domicile = b?.domicile ?? null;

    if (!event_id || !full_name || !email) {
      return NextResponse.json(
        { message: "event_id, full_name, email are required" },
        { status: 400 }
      );
    }

    // Ambil event (+ published check)
    const event = await prisma.events.findFirst({
      where: { id: event_id, deleted_at: null, is_published: true },
      select: {
        id: true,
        title: true,
        start_at: true,
        end_at: true,
        location: true,
        capacity: true,
        pricing_type: true, // "FREE" | "PAID"
        ticket_price: true,
      },
    });
    if (!event) {
      return NextResponse.json(
        { message: "Event not found or not published" },
        { status: 404 }
      );
    }

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
    let usedForCapacity = 0;
    if (typeof event.capacity === "number") {
      // Untuk FREE: hitung CONFIRMED saja (langsung kepakai).
      // Untuk PAID : hitung PENDING + CONFIRMED (tahan slot ketika bayar).
      const statuses =
        event.pricing_type === "FREE"
          ? ["CONFIRMED"]
          : ["PENDING", "CONFIRMED"];

      usedForCapacity = await prisma.tickets.count({
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

    // Tentukan status+harga sesuai tipe event (diabaikan kalau body mencoba override)
    const isPaid = event.pricing_type === "PAID";
    const status = isPaid ? "PENDING" : "CONFIRMED";
    const total_price = isPaid ? Number(event.ticket_price || 0) : 0;

    // Kode tiket & URL QR
    const code = `EVT-${newTicketCode(6)}-${newTicketCode(4)}`;
    const base = originFromReq(req);
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
        paid_at: isPaid ? null : new Date(), // FREE dianggap paid now (gratis)
        expires_at: null,

        checkin_status: "NOT_CHECKED_IN",
        checked_in_at: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Kirim email QR (best-effort)
    if (transporter) {
      try {
        const pngBuffer = await QRCode.toBuffer(code, { width: 512 });
        await transporter.sendMail({
          to: email,
          from: process.env.MAIL_FROM || "OSS CMS <no-reply@localhost>",
          subject: `Tiket ${event.title}`,
          html: `
            <div style="font-family:Arial, sans-serif">
              <h2 style="margin:0 0 12px">Tiket ${
                isPaid ? "Pending" : "Berhasil Dipesan"
              }</h2>
              <p>Event: <b>${event.title}</b></p>
              <p>Jadwal: ${new Date(
                event.start_at
              ).toLocaleString()} - ${new Date(
            event.end_at
          ).toLocaleString()}</p>
              <p>Kode Tiket: <b>${code}</b></p>
              ${
                isPaid
                  ? `<p>Status: <b>PENDING</b>. Silakan selesaikan pembayaran.</p>`
                  : `<p>Status: <b>CONFIRMED</b>. Scan QR berikut saat check-in:</p>`
              }
              <p><img src="cid:ticketqr" alt="QR Code" style="max-width:280px" /></p>
            </div>
          `,
          attachments: [
            {
              filename: "ticket-qr.png",
              content: pngBuffer,
              cid: "ticketqr",
            },
          ],
        });
      } catch (e) {
        console.error("[MAILER] send ticket error:", e?.message || e);
      }
    } else {
      console.warn("[MAILER] SMTP not configured. Ticket email not sent.");
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // unique (event_id,email)
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
   Body (opsional): status, payment_*, total_price, paid_at, expires_at, action=resend
==================================================== */
export async function PATCH(req) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const b = await req.json();

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

    // resend email (opsional)
    if (b?.action === "resend" && transporter) {
      try {
        const base = originFromReq(req);
        const event = await prisma.events.findUnique({
          where: { id: updated.event_id },
          select: {
            id: true,
            title: true,
            start_at: true,
            end_at: true,
          },
        });
        const pngBuffer = await QRCode.toBuffer(updated.ticket_code, {
          width: 512,
        });
        await transporter.sendMail({
          to: updated.email,
          from: process.env.MAIL_FROM || "OSS CMS <no-reply@localhost>",
          subject: `Tiket ${event?.title || "Event"}`,
          html: `
            <div style="font-family:Arial, sans-serif">
              <h2 style="margin:0 0 12px">Salinan Tiket</h2>
              <p>Event: <b>${event?.title || "-"}</b></p>
              <p>Jadwal: ${
                event?.start_at
                  ? new Date(event.start_at).toLocaleString()
                  : "-"
              } - ${
            event?.end_at ? new Date(event.end_at).toLocaleString() : "-"
          }</p>
              <p>Kode Tiket: <b>${updated.ticket_code}</b></p>
              <p><img src="cid:ticketqr" alt="QR Code" style="max-width:280px" /></p>
            </div>
          `,
          attachments: [
            { filename: "ticket-qr.png", content: pngBuffer, cid: "ticketqr" },
          ],
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
