// app/api/admin/bookings/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Postgres mendukung mode insensitive, MySQL tidak
const isPg = /\bpostgres/i.test(process.env.DATABASE_URL || "");
const ci = (v) =>
  v && v.trim()
    ? isPg
      ? { contains: v.trim(), mode: "insensitive" }
      : { contains: v.trim() }
    : undefined;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
    );
    const q = (searchParams.get("q") || "").trim();
    const locale = (searchParams.get("locale") || "id").toLowerCase();
    const fallback = (
      searchParams.get("fallback") || (locale === "id" ? "en" : "id")
    ).toLowerCase();

    const voucher = (searchParams.get("voucher") || "all").toLowerCase(); // "all" | "voucher" | "non"
    const event_id = (searchParams.get("event_id") || "").trim();
    const categoryParam =
      (searchParams.get("category") || "").trim() ||
      (searchParams.get("category_slug") || "").trim();

    const AND = [];

    // Filter voucher
    if (voucher === "voucher") {
      AND.push({
        NOT: [{ voucher_code: null }, { voucher_code: "" }],
      });
    } else if (voucher === "non") {
      AND.push({
        OR: [{ voucher_code: null }, { voucher_code: "" }],
      });
    }

    // Filter event_id
    if (event_id) {
      const n = Number(event_id);
      AND.push({ event_id: Number.isFinite(n) ? n : event_id });
    }

    // Filter kategori: dukung id numerik atau slug
    if (categoryParam) {
      const n = Number(categoryParam);
      const byId = Number.isFinite(n) ? { category_id: n } : null;
      AND.push({
        event: {
          OR: [...(byId ? [byId] : []), { category: { slug: categoryParam } }],
        },
      });
    }

    // Pencarian bebas
    const textFilter = ci(q);
    const OR = q
      ? [
          { rep_name: textFilter },
          { campus_name: textFilter },
          {
            event: {
              events_translate: {
                some: {
                  locale: { in: [locale, fallback] },
                  title: textFilter,
                },
              },
            },
          },
          {
            event: {
              category: {
                translate: {
                  some: {
                    locale: { in: [locale, fallback] },
                    name: textFilter,
                  },
                },
              },
            },
          },
        ]
      : undefined;

    const where = {
      ...(AND.length ? { AND } : {}),
      ...(OR ? { OR } : {}),
    };

    const [total, raw] = await Promise.all([
      prisma.event_booth_bookings.count({ where }),
      prisma.event_booth_bookings.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          event_id: true,
          rep_name: true,
          campus_name: true,
          voucher_code: true,
          order_id: true,
          status: true,
          created_at: true,
          event: {
            select: {
              id: true,
              location: true,
              events_translate: {
                where: { locale: { in: [locale, fallback] } },
                select: { locale: true, title: true },
              },
              category: {
                select: {
                  id: true,
                  slug: true,
                  translate: {
                    where: { locale: { in: [locale, fallback] } },
                    select: { locale: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // 🔧 Ratakan title & category agar UI tidak perlu nebak-nebak
    const data = raw.map((r) => {
      const t = r?.event?.events_translate || [];
      const titlePref =
        t.find((x) => x.locale === locale)?.title ??
        t.find((x) => x.locale === fallback)?.title ??
        r?.event?.location ??
        "";

      const catT = r?.event?.category?.translate || [];
      const catNamePref =
        catT.find((x) => x.locale === locale)?.name ??
        catT.find((x) => x.locale === fallback)?.name ??
        r?.event?.category?.slug ??
        "";

      return {
        ...r,
        event_title: titlePref, // ← dipakai kolom "Nama Event"
        event_category: catNamePref, // ← dipakai kolom "Kategori"
      };
    });

    return NextResponse.json({ page, perPage, total, data });
  } catch (err) {
    console.error("GET /api/admin/bookings error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Failed to fetch bookings" } },
      { status: 500 }
    );
  }
}
