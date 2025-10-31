import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const group = (searchParams.get("group") || "day").toLowerCase();
  const daysParam = searchParams.get("days"); // fallback lama

  try {
    // ======== FULL YEAR MODE ========
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isFinite(y)) {
        return NextResponse.json(
          { error: { message: "Invalid year" } },
          { status: 400 }
        );
      }

      // gunakan rentang [YYYY-01-01, (YYYY+1)-01-01)
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y + 1, 0, 1));

      if (group === "month") {
        // Aggregate bulanan (lebih efisien untuk dashboard)
        // MySQL
        const rows = await prisma.$queryRawUnsafe(
          `
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
                 COUNT(*)                   AS pageviews,
                 COUNT(DISTINCT session_id) AS sessions,
                 COUNT(DISTINCT visitor_id) AS visitors
          FROM analytics_pageviews
          WHERE created_at >= ? AND created_at < ?
          GROUP BY ym
          ORDER BY ym ASC
        `,
          start,
          end
        );

        // pastikan 12 bulan selalu ada (0 kalau tidak ada data)
        const series = Array.from({ length: 12 }, (_, i) => {
          const key = `${y}-${String(i + 1).padStart(2, "0")}`;
          const r = rows.find((x) => x.ym === key);
          return {
            ym: key,
            date: `${key}-01`,
            pageviews: Number(r?.pageviews || 0),
            sessions: Number(r?.sessions || 0),
            visitors: Number(r?.visitors || 0),
          };
        });

        return NextResponse.json({ series });
      }

      // Group harian untuk satu tahun (kalau butuh)
      const rows = await prisma.$queryRawUnsafe(
        `
        SELECT DATE(created_at) AS d,
               COUNT(*)                   AS pageviews,
               COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE created_at >= ? AND created_at < ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `,
        start,
        end
      );

      const series = rows.map((r) => ({
        date: r.d,
        pageviews: Number(r.pageviews || 0),
        sessions: Number(r.sessions || 0),
        visitors: Number(r.visitors || 0),
      }));

      return NextResponse.json({ series });
    }

    // ======== FALLBACK "LAST N DAYS" MODE ========
    const n = Math.min(365, Math.max(1, Number(daysParam || 180)));
    const since = new Date(Date.now() - n * 24 * 3600 * 1000);

    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT DATE(created_at) AS d,
             COUNT(*)                   AS pageviews,
             COUNT(DISTINCT session_id) AS sessions,
             COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_pageviews
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `,
      since
    );

    const series = rows.map((r) => ({
      date: r.d,
      pageviews: Number(r.pageviews || 0),
      sessions: Number(r.sessions || 0),
      visitors: Number(r.visitors || 0),
    }));

    return NextResponse.json({ series });
  } catch (e) {
    return NextResponse.json(
      { error: { message: e?.message || "Analytics error" } },
      { status: 500 }
    );
  }
}
