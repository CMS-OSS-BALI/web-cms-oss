// /app/api/payments/webhook/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySignature, mapStatus } from "@/lib/midtrans";
import { sendBoothInvoiceEmail } from "@/lib/mailer";
import {
  isPassthroughEnabled,
  detectChannelFromWebhook,
  grossUp,
} from "@/lib/pgfees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(d, i) {
  return NextResponse.json(d, i);
}

// Body reader fleksibel (form-data / urlencoded / json)
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
    const body = await readBodyFlexible(req);

    const order_id = String(body?.order_id || "").trim();
    const status_code = String(body?.status_code || "").trim(); // biasanya "200"
    const signature_key = String(body?.signature_key || "").trim();
    const transaction_status = String(
      body?.transaction_status || ""
    ).toLowerCase();
    const gross_amount_raw = String(body?.gross_amount ?? "").trim();

    if (!order_id) {
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Field order_id pada webhook wajib diisi.",
            field: "order_id",
          },
        },
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
      console.error("[MIDTRANS:WEBHOOK] INVALID_SIGNATURE", {
        order_id,
        status_code,
        gross_amount_raw,
      });
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
        email: true,
        event: { select: { booth_quota: true, booth_sold_count: true } },
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

    // === Amount match logic ===
    let expected = bookingAmount;
    let detectedChannel = detectChannelFromWebhook(body);
    if (isPassthroughEnabled() && detectedChannel) {
      expected = grossUp(bookingAmount, detectedChannel).gross;
    }
    const diff = Math.abs(Number(expected) - Number(grossAmount));
    const amountMatch = diff <= 2; // toleransi pembulatan 1-2 IDR

    // Upsert payments log
    await prisma.payments.upsert({
      where: { order_id },
      update: {
        status: String(transaction_status || "").toUpperCase(),
        channel: detectedChannel || body?.payment_type || null,
        gross_amount: grossAmount || bookingAmount,
        raw: body,
        updated_at: new Date(),
      },
      create: {
        order_id,
        booking_id: booking.id,
        status: String(transaction_status || "").toUpperCase(),
        channel: detectedChannel || body?.payment_type || null,
        gross_amount: grossAmount || bookingAmount,
        raw: body,
      },
    });

    const mapped = mapStatus(body); // "paid" | "pending" | "expired" | "failed" | "review" | "cancelled"
    let becamePaid = false;

    if (mapped === "paid") {
      await prisma.$transaction(async (tx) => {
        // Jika jumlah tidak cocok → REVIEW
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
      });

      if (becamePaid && booking.email) {
        try {
          await sendBoothInvoiceEmail({
            to: booking.email,
            order_id,
            amount: bookingAmount,
            status: "PAID",
            paid_at: new Date(),
            channel: detectedChannel || body?.payment_type || null,
            event: booking.event || {},
            support_email: process.env.SUPPORT_EMAIL || process.env.MAIL_FROM,
          });
        } catch (e) {
          console.error("[MAILER] send invoice error:", e?.message || e);
        }
      }
    } else if (["failed", "cancelled", "expired"].includes(mapped)) {
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
