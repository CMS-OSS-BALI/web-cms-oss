// app/api/payments/webhook/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySignature, mapStatus } from "@/lib/midtrans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(d, i) {
  return NextResponse.json(d, i);
}

// ⬇ NEW
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

export async function POST(req) {
  try {
    const body = await readBodyFlexible(req); // ⬅ support form-data

    const order_id = String(body?.order_id || "").trim();
    const status_code = String(body?.status_code || "").trim();
    const gross_amount_raw = String(body?.gross_amount ?? "").trim();
    const signature_key = String(body?.signature_key || "").trim();
    const transaction_status = String(
      body?.transaction_status || ""
    ).toLowerCase();

    if (!order_id) {
      return json(
        { error: { code: "BAD_REQUEST", message: "order_id wajib ada" } },
        { status: 400 }
      );
    }

    const signatureOk = verifySignature({
      order_id,
      status_code,
      gross_amount: gross_amount_raw,
      signature_key,
    });
    if (!signatureOk) {
      return json(
        { error: { code: "UNAUTHORIZED", message: "Invalid signature" } },
        { status: 401 }
      );
    }

    const booking = await prisma.event_booth_bookings.findFirst({
      where: { order_id },
      select: {
        id: true,
        status: true,
        event_id: true,
        voucher_code: true,
        amount: true,
      },
    });
    if (!booking) {
      return json(
        { error: { code: "NOT_FOUND", message: "Booking tidak ditemukan." } },
        { status: 404 }
      );
    }

    const bookingAmount = Number(booking.amount || 0);
    const grossAmount = Number.isFinite(Number(gross_amount_raw))
      ? Number(gross_amount_raw)
      : 0;
    const amountMatch = bookingAmount === grossAmount;

    await prisma.payments.upsert({
      where: { order_id },
      update: {
        status: String(transaction_status || "").toUpperCase(),
        channel: body?.payment_type || body?.channel || null,
        gross_amount: grossAmount || bookingAmount,
        raw: body,
        updated_at: new Date(),
      },
      create: {
        order_id,
        booking_id: booking.id,
        status: String(transaction_status || "").toUpperCase(),
        channel: body?.payment_type || body?.channel || null,
        gross_amount: grossAmount || bookingAmount,
        raw: body,
      },
    });

    const mapped = mapStatus(body); // "paid" | "pending" | "expired" | "failed" | "review" | "cancelled"

    if (mapped === "paid") {
      await prisma.$transaction(
        async (tx) => {
          if (!amountMatch) {
            await tx.event_booth_bookings.updateMany({
              where: { id: booking.id, NOT: { status: "PAID" } },
              data: { status: "REVIEW", updated_at: new Date() },
            });
            return;
          }

          const ev = await tx.events.findUnique({
            where: { id: booking.event_id },
            select: { booth_quota: true, booth_sold_count: true },
          });
          const quota = ev?.booth_quota ?? null;
          const sold = Number(ev?.booth_sold_count || 0);

          if (quota != null && sold >= quota) {
            await tx.event_booth_bookings.updateMany({
              where: { id: booking.id, NOT: { status: "PAID" } },
              data: { status: "REVIEW", updated_at: new Date() },
            });
            return;
          }

          const updated = await tx.event_booth_bookings.updateMany({
            where: { id: booking.id, NOT: { status: "PAID" } },
            data: {
              status: "PAID",
              paid_at: new Date(),
              updated_at: new Date(),
            },
          });

          if (updated.count > 0) {
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
    } else if (
      mapped === "failed" ||
      mapped === "cancelled" ||
      mapped === "expired"
    ) {
      await prisma.event_booth_bookings.updateMany({
        where: {
          id: booking.id,
          status: { in: ["PENDING", "REVIEW", "FAILED"] },
        },
        data: { status: "FAILED", updated_at: new Date() },
      });
    }

    return json({ message: "OK" });
  } catch (err) {
    console.error("POST /api/payments/webhook error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Webhook error." } },
      { status: 500 }
    );
  }
}
