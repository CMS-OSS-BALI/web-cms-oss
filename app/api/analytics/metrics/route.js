import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ymdLocal = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD (lokal)
};

const startOfDayLocal = (d) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.max(
      1,
      Math.min(180, Number(searchParams.get("days")) || 30)
    );

    const today = startOfDayLocal(new Date());
    const start = startOfDayLocal(new Date(today));
    start.setDate(today.getDate() - (days - 1));

    const rows = await prisma.$queryRaw`
      SELECT DATE(created_at) AS d,
             COUNT(*)                   AS pageviews,
             COUNT(DISTINCT session_id) AS sessions,
             COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_pageviews
      WHERE created_at >= ${start}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    // Bangun map YYYY-MM-DD -> nilai
    const map = new Map(
      rows.map((r) => {
        // r.d bisa Date atau string
        const key =
          r?.d instanceof Date ? ymdLocal(r.d) : ymdLocal(String(r?.d));
        return [
          key,
          {
            pageviews: Number(r.pageviews || 0),
            sessions: Number(r.sessions || 0),
            visitors: Number(r.visitors || 0),
          },
        ];
      })
    );

    // Zero-fill
    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = ymdLocal(d);
      series.push({
        date: key,
        ...(map.get(key) || { pageviews: 0, sessions: 0, visitors: 0 }),
      });
    }

    const totals = series.reduce(
      (a, x) => ({
        pageviews: a.pageviews + x.pageviews,
        sessions: a.sessions + x.sessions,
        visitors: a.visitors + x.visitors,
      }),
      { pageviews: 0, sessions: 0, visitors: 0 }
    );

    const averages = {
      pageviews: Math.round(totals.pageviews / days),
      sessions: Math.round(totals.sessions / days),
      visitors: Math.round(totals.visitors / days),
    };

    return NextResponse.json({ days, series, totals, averages });
  } catch (e) {
    // fallback aman kalau tabel belum ada
    if (e?.code === "P2010" && e?.meta?.code === "1146") {
      return NextResponse.json({
        days: Number(new URL(req.url).searchParams.get("days")) || 30,
        series: [],
        totals: { pageviews: 0, sessions: 0, visitors: 0 },
        averages: { pageviews: 0, sessions: 0, visitors: 0 },
      });
    }
    console.error("metrics error", e);
    return NextResponse.json(
      { days: 0, series: [], totals: {}, averages: {} },
      { status: 500 }
    );
  }
}
