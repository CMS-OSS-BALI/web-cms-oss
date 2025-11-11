// /app/api/events/summary/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const category_id =
      (url.searchParams.get("category_id") || "").trim() || null;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.max(
      1,
      Math.min(20, Number(url.searchParams.get("limit") || 8))
    );

    const whereEvent = { deleted_at: null };
    if (category_id) whereEvent.category_id = category_id;
    if (from || to) {
      whereEvent.start_at = {};
      if (from) whereEvent.start_at.gte = new Date(from);
      if (to) whereEvent.start_at.lte = new Date(to);
    }
    if (q) {
      whereEvent.OR = [
        { location: { contains: q } },
        { events_translate: { some: { title: { contains: q } } } },
      ];
    }

    const events = await prisma.events.findMany({
      where: whereEvent,
      select: {
        id: true,
        booth_price: true,
        booth_sold_count: true,
        booth_quota: true,
        location: true,
        start_at: true,
        events_translate: {
          where: { locale: { in: ["id", "en"] } },
          select: { locale: true, title: true },
        },
      },
      orderBy: { start_at: "desc" },
    });

    const eventIds = events.map((e) => e.id);

    const total_reps = events.reduce(
      (a, e) => a + Number(e.booth_sold_count || 0),
      0
    );
    const total_revenue = events.reduce(
      (a, e) =>
        a +
        Number(e.booth_sold_count || 0) *
          Math.max(0, Number(e.booth_price || 0)),
      0
    );

    const total_students = await prisma.tickets.count({
      where: {
        deleted_at: null,
        status: "CONFIRMED",
        ...(eventIds.length ? { event_id: { in: eventIds } } : {}),
      },
    });

    const titleOf = (ev) => {
      const tr = ev.events_translate || [];
      return (
        tr.find((t) => t.locale === "id")?.title ||
        tr.find((t) => t.locale === "en")?.title ||
        "Event"
      );
    };

    const chartRepRows = [...events]
      .sort(
        (a, b) =>
          Number(b.booth_sold_count || 0) - Number(a.booth_sold_count || 0)
      )
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        label: titleOf(e),
        value: Number(e.booth_sold_count || 0),
      }));

    let chartStudentRows = [];
    if (eventIds.length) {
      const grouped = await prisma.tickets.groupBy({
        by: ["event_id"],
        where: {
          deleted_at: null,
          status: "CONFIRMED",
          event_id: { in: eventIds },
        },
        _count: { id: true }, // ✅ kolom yang valid
        orderBy: { _count: { id: "desc" } }, // ✅ sort by count(id)
        take: limit,
      });

      const titleMap = new Map(events.map((e) => [e.id, titleOf(e)]));
      chartStudentRows = grouped.map((g) => ({
        id: g.event_id,
        label: titleMap.get(g.event_id) || "Event",
        value: g._count.id,
      }));
    }

    return json({
      message: "OK",
      data: {
        totals: {
          students: total_students,
          reps: total_reps,
          revenue: total_revenue,
        },
        charts: { students: chartStudentRows, reps: chartRepRows },
      },
    });
  } catch (err) {
    console.error("GET /api/events/summary error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to build summary." } },
      { status: 500 }
    );
  }
}
