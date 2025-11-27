// /app/api/payments/check/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchStatus, mapStatus } from "@/lib/midtrans";
import {
  isPassthroughEnabled,
  detectChannelFromMidtrans,
  grossUp,
} from "@/lib/pgfees";
import {
  authenticatePaymentRequest,
  getSignedPaymentToken,
} from "@/lib/security/paymentAccess";
import { getClientIp } from "@/lib/security/requestUtils";
import { consumeRateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
function notFound(m = "Booking tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message: m } }, { status: 404 });
}
function unauthorized() {
  return json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Tidak boleh mengakses status pembayaran.",
      },
    },
    { status: 401 }
  );
}
function tooManyRequests() {
  return json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Terlalu banyak percobaan. Coba lagi nanti.",
      },
    },
    { status: 429 }
  );
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const order_id = (url.searchParams.get("order_id") || "").trim();
    const ip = getClientIp(req);
    const rate = consumeRateLimit(`payments-check:${ip}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.success) {
      console.warn("[payments-check] rate limited", { order_id, ip });
      return tooManyRequests();
    }
    if (!order_id) return bad("order_id wajib diisi", "order_id");

    const auth = await authenticatePaymentRequest(req, {
      orderId: order_id,
      allowSignedNonce: true,
    });
    if (!auth.ok) {
      const hasToken = Boolean(getSignedPaymentToken(req));
      console.warn("[payments-check] unauthorized attempt", {
        order_id,
        ip,
        hasToken,
        ua: req.headers.get("user-agent"),
      });
      return unauthorized();
    }

    const booking = await prisma.event_booth_bookings.findFirst({
      where: { order_id },
      select: {
        id: true,
        order_id: true,
        status: true,
        amount: true,
        event_id: true,
        voucher_code: true,
        created_at: true,
        paid_at: true,
        payments: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            channel: true,
            gross_amount: true,
            created_at: true,
          },
        },
      },
    });
    if (!booking) return notFound();

    const mid = await fetchStatus(order_id).catch((e) => ({
      error: true,
      message: e?.message || "Midtrans status error",
      info: e?.info,
    }));

    let mid_summary = null;
    let expected_gross = Number(booking.amount || 0);
    let amount_match = null;
    const lastPayment = booking.payments?.[0] || null;
    const lastPaymentGross = Number.isFinite(Number(lastPayment?.gross_amount))
      ? Number(lastPayment.gross_amount)
      : null;

    if (!mid?.error) {
      const mapped = mapStatus(mid);
      const gross = Number.isFinite(Number(mid?.gross_amount))
        ? Number(mid.gross_amount)
        : null;
      const ch = detectChannelFromMidtrans(mid);

      if (isPassthroughEnabled()) {
        if (ch) {
          expected_gross = grossUp(booking.amount, ch).gross;
        } else if (lastPaymentGross != null) {
          expected_gross = lastPaymentGross;
        }
      } else if (lastPaymentGross != null) {
        expected_gross = lastPaymentGross;
      }

      amount_match =
        gross == null ? null : Math.abs(expected_gross - gross) <= 2;

      mid_summary = {
        transaction_status: mid?.transaction_status || null,
        fraud_status: mid?.fraud_status || null,
        payment_type: mid?.payment_type || null,
        mapped,
        gross_amount: gross,
        status_code: mid?.status_code || null,
      };
    }

    // Saran UI (tidak melakukan write)
    let advice = "none";
    if (mid_summary?.mapped === "paid" && booking.status !== "PAID") {
      advice = "await_webhook_or_reconcile";
    } else if (
      ["failed", "expired", "cancelled"].includes(mid_summary?.mapped || "") &&
      !["FAILED", "CANCELLED"].includes(booking.status)
    ) {
      advice = "await_webhook_or_reconcile";
    }

    return json({
      message: "OK",
      data: {
        booking: {
          id: booking.id,
          order_id: booking.order_id,
          status: booking.status,
          amount: booking.amount,
          last_payment: booking.payments?.[0] || null,
        },
        midtrans: mid?.error
          ? { error: mid.message, info: mid.info }
          : mid_summary,
        expected_gross,
        amount_match,
        advice,
      },
    });
  } catch (err) {
    console.error("GET /api/payments/check error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal mengecek status." } },
      { status: 500 }
    );
  }
}
