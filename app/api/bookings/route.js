// app/api/bookings/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

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
function toInt(v, d = null) {
  if (v === "" || v == null || v === undefined) return d;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
function sanitizeCode(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

// ⇩⇩ NEW: baca body fleksibel (JSON, urlencoded, multipart) ⇩⇩
async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue; // booking tidak pakai file
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

export async function POST(req) {
  try {
    const body = await readBodyFlexible(req); // <<< ganti dari req.json()

    const event_id = String(body?.event_id || "").trim();
    const rep_name = String(body?.rep_name || "").trim();
    const campus_name = String(body?.campus_name || "").trim();
    const country = String(body?.country || "").trim();
    const address = String(body?.address || "").trim();
    const whatsapp = String(body?.whatsapp || "").trim();
    const email = body?.email ? String(body.email).trim() : null;

    if (!event_id) return bad("event_id wajib diisi", "event_id");
    if (!rep_name) return bad("rep_name wajib diisi", "rep_name");
    if (!country) return bad("country wajib diisi", "country");
    if (!campus_name) return bad("campus_name wajib diisi", "campus_name");
    if (!address) return bad("address wajib diisi", "address");
    if (!whatsapp) return bad("whatsapp wajib diisi", "whatsapp");

    const event = await prisma.events.findUnique({
      where: { id: event_id },
      select: {
        id: true,
        is_published: true,
        booth_price: true,
        booth_quota: true,
        booth_sold_count: true,
      },
    });
    if (!event)
      return json(
        { error: { code: "NOT_FOUND", message: "Event tidak ditemukan." } },
        { status: 404 }
      );
    if (!event.is_published) return bad("Event belum dipublish", "event_id");

    // Kuota awal
    const quota = event.booth_quota;
    const sold = Number(event.booth_sold_count || 0);
    if (quota != null && sold >= quota) {
      return json(
        { error: { code: "SOLD_OUT", message: "Kuota booth habis." } },
        { status: 409 }
      );
    }

    // Voucher opsional
    let voucher = null;
    let voucher_code = body?.voucher_code
      ? sanitizeCode(body.voucher_code)
      : null;
    if (voucher_code) {
      const now = new Date();
      const v = await prisma.vouchers.findUnique({
        where: { code: voucher_code },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          max_discount: true,
          is_active: true,
          max_uses: true,
          used_count: true,
          valid_from: true,
          valid_to: true,
          event_id: true,
        },
      });
      if (!v) return bad("Kode voucher tidak valid", "voucher_code");
      if (!v.is_active) return bad("Voucher tidak aktif", "voucher_code");
      if (v.valid_from && v.valid_from > now)
        return bad("Voucher belum aktif", "voucher_code");
      if (v.valid_to && v.valid_to < now)
        return bad("Voucher sudah kedaluwarsa", "voucher_code");
      if (v.max_uses != null && v.used_count >= v.max_uses)
        return bad("Voucher telah mencapai batas pemakaian", "voucher_code");
      if (v.event_id && v.event_id !== event_id)
        return bad("Voucher tidak berlaku untuk event ini", "voucher_code");
      voucher = v;
    }

    const basePrice = Math.max(0, toInt(event.booth_price, 0) || 0);

    // Hitung diskon
    let discount = 0;
    if (voucher) {
      if (voucher.type === "FIXED") {
        discount = Math.max(0, Math.min(basePrice, voucher.value));
      } else {
        const raw = Math.floor(
          (basePrice * Math.max(0, Math.min(100, voucher.value))) / 100
        );
        const capped =
          voucher.max_discount != null
            ? Math.min(raw, Math.max(0, voucher.max_discount))
            : raw;
        discount = Math.max(0, Math.min(basePrice, capped));
      }
    }
    const amount = Math.max(0, basePrice - discount);
    // NOTE: kalau mau melarang booking amount=0, aktifkan guard di sini.

    const order_id = `BB-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const created = await prisma.event_booth_bookings.create({
      data: {
        event_id,
        order_id,
        rep_name,
        country,
        campus_name,
        address,
        whatsapp,
        email: email || null,
        voucher_code: voucher_code || null,
        amount,
        status: "PENDING",
      },
      select: {
        id: true,
        order_id: true,
        status: true,
        amount: true,
        voucher_code: true,
        event_id: true,
        created_at: true,
      },
    });

    return json(
      {
        message: "Booking booth dibuat. Silakan lanjutkan pembayaran.",
        data: created,
        meta: { base_price: basePrice, discount_applied: discount },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal membuat booking." } },
      { status: 500 }
    );
  }
}
