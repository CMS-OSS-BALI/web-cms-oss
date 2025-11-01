// /app/api/payments/charge/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  snapCreate,
  fetchStatus,
  ensureIntegerIDR,
  normalizeEnabledPayments,
} from "@/lib/midtrans";

import {
  isPassthroughEnabled,
  mapEnabledToChannel,
  withFeeItem,
  channelLabel,
} from "@/lib/pgfees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ===== Helpers ===== */
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
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function badRequest(message, field, code = "BAD_REQUEST") {
  return json(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status: 400 }
  );
}
function notFound(msg = "Booking tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message: msg } }, { status: 404 });
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

// ENV
const ENABLED_PAYMENTS_RAW = process.env.MIDTRANS_ENABLED_PAYMENTS || "all";
const EXPIRY_MINUTES = toInt(process.env.MIDTRANS_EXPIRY_MINUTES, 30);

/** ===== Worst-case gross-up bila channel dipilih di Snap =====
 * normalizedEnabled:
 *  - null    → "all" (tak ada batasan)
 *  - string[] (kode midtrans: 'qris','gopay',...) → subset
 * Mekanisme: coba semua kandidat channel, hitung withFeeItem, ambil gross terbesar.
 */
function computeWorstCaseFee(itemsBase, baseAmount, normalizedEnabled) {
  // Kandidat "enabled_payments" (midtrans codes) → map ke channel internal
  let candidates;
  if (normalizedEnabled === null) {
    // semua channel umum yang kita dukung fee-nya
    candidates = [
      "qris",
      "gopay",
      "shopeepay",
      "dana",
      "bank_transfer", // VA
      "credit_card",
      "alfamart",
      "indomaret",
    ];
  } else {
    candidates = Array.isArray(normalizedEnabled) ? normalizedEnabled : [];
  }

  const channels = candidates
    .map((c) => mapEnabledToChannel(c))
    .filter(Boolean);

  let best = {
    gross: baseAmount,
    items: itemsBase,
    channel: null,
  };

  for (const ch of channels) {
    const res = withFeeItem([...itemsBase], baseAmount, ch);
    if (Number(res.gross) > Number(best.gross)) {
      best = { gross: res.gross, items: res.items, channel: ch };
    }
  }

  return best; // jika tidak ada kandidat valid → kembali ke base (no fee)
}

export async function POST(req) {
  try {
    const body = await readBodyFlexible(req);
    const booking_id = String(body?.booking_id || "").trim();
    const order_id_in = String(body?.order_id || "").trim();

    if (!booking_id && !order_id_in) {
      return badRequest("booking_id atau order_id wajib diisi", "booking_id");
    }

    const where =
      booking_id?.length > 0 ? { id: booking_id } : { order_id: order_id_in };

    const booking = await prisma.event_booth_bookings.findFirst({
      where,
      select: {
        id: true,
        order_id: true,
        status: true,
        amount: true,
        voucher_code: true,
        rep_name: true,
        campus_name: true,
        country: true,
        address: true,
        whatsapp: true,
        email: true,
        created_at: true,
        event: {
          select: {
            id: true,
            is_published: true,
            booth_price: true,
            booth_quota: true,
            booth_sold_count: true,
            start_at: true,
            end_at: true,
            location: true,
          },
        },
      },
    });
    if (!booking) return notFound();

    if (booking.status === "PAID") {
      return json(
        { error: { code: "ALREADY_PAID", message: "Booking sudah dibayar." } },
        { status: 409 }
      );
    }
    if (booking.status === "CANCELLED" || booking.status === "FAILED") {
      return json(
        {
          error: {
            code: "INVALID_STATE",
            message:
              "Booking sudah dibatalkan/gagal. Buat booking baru untuk pembayaran.",
          },
        },
        { status: 409 }
      );
    }

    const ev = booking.event;
    if (!ev?.is_published)
      return badRequest("Event belum dipublish", "event_id");
    const quota = ev.booth_quota ?? null;
    const sold = Number(ev.booth_sold_count || 0);
    if (quota != null && sold >= quota) {
      return json(
        { error: { code: "SOLD_OUT", message: "Kuota booth habis." } },
        { status: 409 }
      );
    }

    const baseAmount = ensureIntegerIDR(booking.amount, booking.amount);

    // ---- Enabled payments (prioritas body → ENV) ----
    const enabledFromBody =
      body?.enabled_payments != null ? body.enabled_payments : undefined;
    const normalizedEnabled = normalizeEnabledPayments(
      enabledFromBody ?? ENABLED_PAYMENTS_RAW
    );
    // normalizedEnabled === null → "all" (bebaskan Snap tampilkan semua kanal yang aktif)

    // ---- Idempotent reuse SNAP token (hanya jika gross sama) ----
    const existingPay = await prisma.payments.findUnique({
      where: { order_id: booking.order_id },
      select: { id: true, status: true, raw: true, gross_amount: true },
    });

    // Build base item
    let items = [
      {
        id: "booth",
        name: `Booth - ${ev.location || "Event"}`,
        price: baseAmount,
        quantity: 1,
        category: "event_booth",
      },
    ];

    // ==== Hitung finalAmount (passthrough / merchant absorb) ====
    let finalAmount = baseAmount;
    let selectedChannel = null; // diketahui hanya jika client memaksa single channel
    let passthroughMode = "off";
    let worstCaseInfo = null;

    if (isPassthroughEnabled()) {
      // CASE A: client kirim tepat 1 channel → gross-up spesifik
      if (Array.isArray(normalizedEnabled) && normalizedEnabled.length === 1) {
        const ch = mapEnabledToChannel(normalizedEnabled[0]);
        if (!ch) {
          return badRequest("Channel tidak dikenal.", "enabled_payments");
        }
        const res = withFeeItem(items, baseAmount, ch);
        items = res.items;
        finalAmount = res.gross;
        selectedChannel = ch;
        passthroughMode = "single";
      } else {
        // CASE B: Snap menampilkan banyak opsi (atau "all") → gross-up worst-case
        const best = computeWorstCaseFee(items, baseAmount, normalizedEnabled);
        items = best.items;
        finalAmount = best.gross;
        selectedChannel = null; // kanal nyata baru diketahui saat selesai bayar
        passthroughMode = "worst_case";
        worstCaseInfo = {
          candidate_count:
            normalizedEnabled === null
              ? "all"
              : (normalizedEnabled || []).length,
          worst_channel: best.channel,
          worst_channel_label: channelLabel(best.channel),
        };
      }
    } else {
      // merchant absorb
      passthroughMode = "off";
    }

    // ==== Reuse token bila gross sama dan belum final ====
    if (existingPay?.raw?.redirect_url && existingPay?.raw?.token) {
      const statusUpper = String(existingPay.status || "").toUpperCase();
      const finalStates = new Set(["SETTLEMENT", "CAPTURE", "SUCCESS", "PAID"]);
      if (
        !finalStates.has(statusUpper) &&
        Number(existingPay.gross_amount) === Number(finalAmount)
      ) {
        return json({
          message: "SNAP token sudah ada (idempotent).",
          data: {
            token: existingPay.raw.token,
            redirect_url: existingPay.raw.redirect_url,
            order_id: booking.order_id,
            amount: finalAmount,
          },
        });
      }
    }

    const customer = {
      first_name: booking.rep_name || "Rep",
      last_name: booking.campus_name || "",
      email: booking.email || undefined,
      phone: booking.whatsapp || undefined,
    };

    // ==== Build Snap payload (JANGAN memaksa single channel kalau mau pilih di Snap) ====
    let snapRes;
    try {
      snapRes = await snapCreate({
        order_id: booking.order_id,
        amount: finalAmount,
        customer,
        enabled_payments: normalizedEnabled ?? null, // null = all (biarkan Snap)
        expiry: {
          unit: "minutes",
          duration: Math.max(5, Math.min(1440, EXPIRY_MINUTES)),
        },
        items,
        metadata: {
          selected_channel: selectedChannel || null, // saat "single"
          base_amount: baseAmount,
          passthrough: isPassthroughEnabled() ? 1 : 0,
          passthrough_mode: passthroughMode, // 'single' | 'worst_case' | 'off'
          ...(worstCaseInfo ? { worst_case: worstCaseInfo } : {}),
        },
        custom_field1: booking.id,
      });
    } catch (e) {
      const alreadyUsed =
        e?.status === 409 ||
        String(e?.info?.status_message || "")
          .toLowerCase()
          .includes("order id");
      if (alreadyUsed) {
        try {
          const st = await fetchStatus(booking.order_id);
          const txStat = String(st?.transaction_status || "").toLowerCase();
          if (txStat === "pending") {
            return json(
              {
                error: {
                  code: "ORDER_PENDING",
                  message:
                    "Transaksi dengan order_id ini sedang pending di Midtrans.",
                },
                data: { order_id: booking.order_id, amount: finalAmount },
              },
              { status: 409 }
            );
          }
          if (["settlement", "capture", "success"].includes(txStat)) {
            return json(
              {
                error: {
                  code: "ALREADY_PAID",
                  message:
                    "Transaksi telah dibayar di Midtrans. Menunggu webhook / lakukan rekonsiliasi.",
                },
                data: { order_id: booking.order_id },
              },
              { status: 409 }
            );
          }
          return json(
            {
              error: {
                code: "ORDER_NOT_PAYABLE",
                message:
                  "Order di Midtrans tidak bisa diproses (expired/cancelled/deny). Buat booking baru.",
              },
              data: { order_id: booking.order_id, midtrans: st },
            },
            { status: 409 }
          );
        } catch {
          return json(
            {
              error: {
                code: "MIDTRANS_CONFLICT",
                message:
                  "order_id sudah digunakan. Tidak dapat membuat transaksi baru.",
              },
            },
            { status: 409 }
          );
        }
      }
      console.error("snapCreate error:", e);
      return json(
        {
          error: {
            code: "MIDTRANS_ERROR",
            message: e?.message || "Gagal membuat transaksi Midtrans.",
            info: e?.info || undefined,
          },
        },
        { status: e?.status || 502 }
      );
    }

    await prisma.payments.upsert({
      where: { order_id: booking.order_id },
      update: {
        status: "PENDING",
        channel: selectedChannel, // null pada worst_case (kanal asli diketahui saat webhook/check)
        gross_amount: finalAmount,
        raw: {
          ...(existingPay?.raw && typeof existingPay.raw === "object"
            ? existingPay.raw
            : {}),
          token: snapRes.token,
          redirect_url: snapRes.redirect_url,
          created_via: "charge_endpoint",
          items,
        },
        updated_at: new Date(),
      },
      create: {
        order_id: booking.order_id,
        booking_id: booking.id,
        status: "PENDING",
        channel: selectedChannel,
        gross_amount: finalAmount,
        raw: {
          token: snapRes.token,
          redirect_url: snapRes.redirect_url,
          created_via: "charge_endpoint",
          items,
        },
      },
      select: { id: true },
    });

    return json({
      message: "SNAP token dibuat.",
      data: {
        token: snapRes.token,
        redirect_url: snapRes.redirect_url,
        order_id: booking.order_id,
        amount: finalAmount,
        fee_mode: isPassthroughEnabled()
          ? `passthrough (${passthroughMode}${
              selectedChannel ? ` • ${channelLabel(selectedChannel)}` : ""
            })`
          : "merchant_absorb",
      },
    });
  } catch (err) {
    console.error("POST /api/payments/charge error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal membuat Snap token." } },
      { status: 500 }
    );
  }
}
