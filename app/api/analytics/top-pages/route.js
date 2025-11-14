import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePeriod(period) {
  const now = new Date();
  const end = new Date(now);
  if (period === "ytd") {
    const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
    return { start, end, label: `YTD ${now.getFullYear()}` };
  }
  if (!period) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end, label: "30d" };
  }
  const m = String(period).match(/^(\d+)([dwm y])$/i);
  if (!m) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end, label: "30d" };
  }
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const start = new Date(now);
  if (unit === "d") start.setDate(start.getDate() - n);
  else if (unit === "w") start.setDate(start.getDate() - n * 7);
  else if (unit === "m") start.setMonth(start.getMonth() - n);
  else if (unit === "y") start.setFullYear(start.getFullYear() - n);
  return { start, end, label: `${n}${unit}` };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30d";
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || 10))
  );
  const prefix = searchParams.get("path_prefix"); // optional, e.g. "/blog"

  try {
    const { start, end } = parsePeriod(period);

    // When prefix provided, add WHERE path LIKE 'prefix%'
    const whereParts = [
      Prisma.sql`created_at >= ${start}`,
      Prisma.sql`created_at < ${end}`,
    ];
    if (prefix) {
      whereParts.push(Prisma.sql`path LIKE ${`${prefix}%`}`);
    }

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT path,
               COUNT(*)                   AS pageviews,
               COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
        GROUP BY path
        ORDER BY pageviews DESC
        LIMIT ${limit}
      `
    );
    const out = rows.map((r) => ({
      path: r.path,
      pageviews: Number(r.pageviews || 0),
      sessions: Number(r.sessions || 0),
      visitors: Number(r.visitors || 0),
    }));
    return NextResponse.json({ rows: out });
  } catch (e) {
    return NextResponse.json(
      { error: { message: e?.message || "Top pages error" } },
      { status: 500 }
    );
  }
}
