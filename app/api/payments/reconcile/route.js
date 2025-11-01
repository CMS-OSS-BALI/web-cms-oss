// /app/api/payments/reconcile/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchStatus, mapStatus } from "@/lib/midtrans";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendBoothInvoiceEmail } from "@/lib/mailer";
import {
  isPassthroughEnabled,
  detectChannelFromMidtrans,
  grossUp,
} from "@/lib/pgfees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const ALLOW_PUBLIC_RECONCILE =
  String(process.env.ALLOW_PUBLIC_RECONCILE || "").trim() === "1";

function sanitize(v) {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(d, i) {
  return NextResponse.json(sanitize(d), i);
}
function bad(m, f) {
  return json(
    { error: { code: "BAD_REQUEST", message: m, ...(f ? { field: f } : {}) } },
    { status: 400 }
  );
}
function toInt(v, d = null) {
  if (v === "" || v == null || v === undefined) return d;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}
async function assertAdminOrCron(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) return true;

  const cron = req.headers.get("x-cron-key");
  if (cron && CRON_SECRET && cron === CRON_SECRET) return true;

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (admin) return true;
  }
  throw new Response("Unauthorized", { status: 401 });
}

async function reconcileOne(order_id) {
  const booking = await prisma.event_booth_bookings.findFirst({
    where: { order_id },
    select: {
      id: true,
      order_id: true,
      status: true,
      amount: true,
      event_id: true,
      voucher_code: true,
      email: true,
      event: { select: { booth_quota: true, booth_sold_count: true } },
    },
  });

  if (!booking) return { order_id, ok: false, reason: "BOOKING_NOT_FOUND" };

  const mid = await fetchStatus(order_id);
  const mapped = mapStatus(mid);
  const payment_type = mid?.payment_type || null;
  const gross_amount = Number.isFinite(Number(mid?.gross_amount))
    ? Number(mid.gross_amount)
    : null;

  // Expected gross if passthrough
  let expected = Number(booking.amount || 0);
  const ch = detectChannelFromMidtrans(mid);
  if (isPassthroughEnabled() && ch) {
    expected = grossUp(booking.amount, ch).gross;
  }
  const amountMatch =
    gross_amount == null
      ? true
      : Math.abs(Number(expected) - Number(gross_amount)) <= 2;

  await prisma.payments.upsert({
    where: { order_id },
    update: {
      status: String(mid?.transaction_status || "").toUpperCase(),
      channel: ch || payment_type,
      gross_amount: gross_amount ?? booking.amount,
      raw: mid,
      updated_at: new Date(),
    },
    create: {
      order_id,
      booking_id: booking.id,
      status: String(mid?.transaction_status || "").toUpperCase(),
      channel: ch || payment_type,
      gross_amount: gross_amount ?? booking.amount,
      raw: mid,
    },
  });

  if (mapped === "paid") {
    let becamePaid = false;

    await prisma.$transaction(
      async (tx) => {
        if (!amountMatch) {
          await tx.event_booth_bookings.updateMany({
            where: { id: booking.id, NOT: { status: "PAID" } },
            data: { status: "REVIEW", updated_at: new Date() },
          });
          return;
        }

        const quota = booking.event?.booth_quota ?? null;
        const sold = Number(booking.event?.booth_sold_count || 0);

        if (quota != null && sold >= quota) {
          await tx.event_booth_bookings.updateMany({
            where: { id: booking.id, NOT: { status: "PAID" } },
            data: { status: "REVIEW", updated_at: new Date() },
          });
          return;
        }

        const updated = await tx.event_booth_bookings.updateMany({
          where: { id: booking.id, NOT: { status: "PAID" } },
          data: { status: "PAID", paid_at: new Date(), updated_at: new Date() },
        });

        if (updated.count > 0) {
          becamePaid = true;

          if (quota == null || sold < quota) {
            await tx.events.update({
              where: { id: booking.event_id },
              data: {
                booth_sold_count: { increment: 1 },
                updated_at: new Date(),
              },
            });
          } else {
            await tx.event_booth_bookings.update({
              where: { id: booking.id },
              data: { status: "REVIEW", updated_at: new Date() },
            });
            becamePaid = false;
          }

          if (booking.voucher_code) {
            await tx.$executeRaw`
              UPDATE vouchers
              SET used_count = used_count + 1, updated_at = NOW(6)
              WHERE code = ${booking.voucher_code}
                AND is_active = TRUE
                AND (max_uses IS NULL OR used_count < max_uses)
            `;
          }
        }
      },
      { isolationLevel: "Serializable" }
    );

    if (becamePaid && booking.email) {
      try {
        await sendBoothInvoiceEmail({
          to: booking.email,
          order_id,
          amount: Number(booking.amount || 0),
          status: "PAID",
          paid_at: new Date(),
          channel: ch || payment_type,
          event: booking.event || {},
          support_email: process.env.SUPPORT_EMAIL || process.env.MAIL_FROM,
        });
      } catch (e) {
        console.error("[MAILER] send invoice error:", e?.message || e);
      }
    }

    return { order_id, ok: true, mapped, reconciled: true };
  }

  if (["failed", "cancelled", "expired"].includes(mapped)) {
    await prisma.event_booth_bookings.updateMany({
      where: {
        id: booking.id,
        status: { in: ["PENDING", "REVIEW", "FAILED"] },
      },
      data: { status: "FAILED", updated_at: new Date() },
    });
    return { order_id, ok: true, mapped, reconciled: true };
  }

  return { order_id, ok: true, mapped, reconciled: false };
}

export async function POST(req) {
  try {
    const isPublicHeader = req.headers.get("x-public-reconcile") === "1";
    const body = await readBodyFlexible(req);
    const order_id =
      typeof body?.order_id === "string" ? body.order_id.trim() : "";

    if (isPublicHeader && ALLOW_PUBLIC_RECONCILE) {
      if (!order_id) return bad("order_id wajib diisi", "order_id");
      const res = await reconcileOne(order_id);
      const status = res.ok
        ? 200
        : res.reason === "BOOKING_NOT_FOUND"
        ? 404
        : 400;
      return json({ message: "OK", data: res }, { status });
    }

    await assertAdminOrCron(req);

    if (order_id) {
      const res = await reconcileOne(order_id);
      const status = res.ok
        ? 200
        : res.reason === "BOOKING_NOT_FOUND"
        ? 404
        : 400;
      return json({ message: "OK", data: res }, { status });
    }

    const olderThanMinutes = Math.max(1, toInt(body?.older_than_minutes, 10));
    const limit = Math.max(1, Math.min(50, toInt(body?.limit, 10) || 20));
    const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const pendings = await prisma.event_booth_bookings.findMany({
      where: { status: "PENDING", created_at: { lte: threshold } },
      orderBy: { created_at: "asc" },
      take: limit,
      select: { order_id: true },
    });

    const results = [];
    for (const p of pendings) {
      try {
        results.push(await reconcileOne(p.order_id));
      } catch (e) {
        results.push({
          order_id: p.order_id,
          ok: false,
          reason: "RECONCILE_ERROR",
          message: e?.message,
        });
      }
    }

    return json({ message: "OK", data: { count: results.length, results } });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) return err;
    console.error("POST /api/payments/reconcile error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal rekonsiliasi." } },
      { status: 500 }
    );
  }
}
