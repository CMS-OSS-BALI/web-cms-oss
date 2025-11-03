// app/api/bookings/[id]/route.js
import prisma from "@/lib/prisma";
import { json, notFound, assertAdmin } from "@/app/api/bookings/_utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;

    const bk = await prisma.event_booth_bookings.findUnique({
      where: { id },
      select: {
        id: true,
        order_id: true,
        event_id: true,
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
        paid_at: true,
        event: {
          select: {
            booth_price: true,
            booth_quota: true,
            booth_sold_count: true,
            start_at: true,
            end_at: true,
          },
        },
        payments: {
          select: {
            id: true,
            order_id: true,
            channel: true,
            status: true,
            gross_amount: true,
            created_at: true,
          },
        },
      },
    });

    if (!bk) return notFound();

    return json({ message: "OK", data: bk });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    console.error(`GET /api/bookings/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat booking." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;

    const cur = await prisma.event_booth_bookings.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!cur) return notFound();
    if (cur.status === "PAID") {
      return json(
        {
          error: {
            code: "INVALID_STATE",
            message: "Tidak dapat membatalkan booking yang sudah dibayar.",
          },
        },
        { status: 409 }
      );
    }

    const up = await prisma.event_booth_bookings.update({
      where: { id },
      data: { status: "CANCELLED", updated_at: new Date() },
      select: { id: true, status: true },
    });

    return json({ message: "Booking dibatalkan.", data: up });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/bookings/${params?.id} error:`, err);
    return json(
      {
        error: { code: "SERVER_ERROR", message: "Gagal membatalkan booking." },
      },
      { status: 500 }
    );
  }
}
