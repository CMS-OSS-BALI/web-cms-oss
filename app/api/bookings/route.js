// app/api/bookings/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  readBody,
  toIntCurrency,
  sanitizeCode,
  getEventForBooking,
  getVoucherByCode,
  validateVoucher,
  computeDiscount,
  genOrderId,
  isAdminDebug,
} from "./_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await readBody(req);

    // required
    const event_id = String(body?.event_id || "").trim();
    const rep_name = String(body?.rep_name || "").trim();
    const campus_name = String(body?.campus_name || "").trim();
    const country = String(body?.country || "").trim();
    const address = String(body?.address || "").trim();
    const whatsapp = String(body?.whatsapp || "").trim();
    const email = body?.email ? String(body.email).trim() : null;

    if (!event_id) return badRequest("event_id wajib diisi", "event_id");
    if (!rep_name) return badRequest("rep_name wajib diisi", "rep_name");
    if (!country) return badRequest("country wajib diisi", "country");
    if (!campus_name)
      return badRequest("campus_name wajib diisi", "campus_name");
    if (!address) return badRequest("address wajib diisi", "address");
    if (!whatsapp) return badRequest("whatsapp wajib diisi", "whatsapp");

    // event & quota
    const event = await getEventForBooking(event_id);
    if (!event)
      return json(
        { error: { code: "NOT_FOUND", message: "Event tidak ditemukan." } },
        { status: 404 }
      );
    if (!event.is_published)
      return badRequest("Event belum dipublish", "event_id");

    const quota = event.booth_quota;
    const sold = Number(event.booth_sold_count || 0);
    if (quota != null && sold >= quota) {
      return json(
        { error: { code: "SOLD_OUT", message: "Kuota booth habis." } },
        { status: 409 }
      );
    }

    // voucher (optional)
    let voucher = null;
    let voucher_code = body?.voucher_code
      ? sanitizeCode(body.voucher_code)
      : null;
    if (voucher_code) {
      const v = await getVoucherByCode(voucher_code);
      const reason = validateVoucher(v, event_id, new Date());
      if (reason) return badRequest(reason, "voucher_code");
      voucher = v;
    }

    // pricing (server-side only)
    const basePrice = Math.max(0, toIntCurrency(event.booth_price, 0) || 0);
    const discount = computeDiscount(basePrice, voucher);
    const amount = Math.max(0, basePrice - discount);
    // NOTE: kalau mau larang amount=0, tambahkan guard di sini.

    // server ref
    const order_id = genOrderId();

    // create booking (do NOT expose amount/order_id publicly)
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
        event_id: true,
      },
    });

    const res = {
      message: "Booking booth dibuat. Silakan lanjutkan pembayaran.",
      data: created, // { id, event_id }
    };

    if (isAdminDebug(req)) {
      res.meta = {
        base_price: basePrice,
        discount_applied: discount,
        amount,
      };
    }

    return json(res, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal membuat booking." } },
      { status: 500 }
    );
  }
}
