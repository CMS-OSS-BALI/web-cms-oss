import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parse "period" like 7d, 26w, 6m, 5y, "ytd" */
function parsePeriod(period) {
  const now = new Date();
  const end = new Date(now); // exclusive upper bound
  if (period === "ytd") {
    const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
    return { start, end, label: `YTD ${now.getFullYear()}` };
  }
  if (!period) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end, label: "30d" };
  }
  const m = String(period).match(/^(\d+)([dwmy])$/i);
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

const GROUP_EXPRESSIONS = {
  day: Prisma.sql`DATE_FORMAT(created_at, '%Y-%m-%d')`,
  week: Prisma.sql`DATE_FORMAT(created_at, '%x-W%v')`,
  month: Prisma.sql`DATE_FORMAT(created_at, '%Y-%m')`,
  year: Prisma.sql`DATE_FORMAT(created_at, '%Y')`,
};

function toISODate(d) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}
const serializeBucket = (b) => {
  if (typeof b === "string") {
    // 'YYYY-MM-DD' or 'YYYY-MM' or 'YYYY'
    return b.length >= 10 ? b.slice(0, 10) : b;
  }
  try {
    return toISODate(new Date(b));
  } catch {
    return String(b);
  }
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const groupRaw = (searchParams.get("group") || "day").toLowerCase(); // day|week|month|year
  const daysParam = searchParams.get("days"); // backward compat
  const periodParam = searchParams.get("period"); // 30d, 12w, 6m, 5y, ytd
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const GROUP = ["day", "week", "month", "year"].includes(groupRaw)
    ? groupRaw
    : "day";

  try {
    // ===== Legacy: full year mode =====
    if (yearParam && !startParam && !periodParam && !daysParam) {
      const y = Number(yearParam);
      if (!Number.isFinite(y)) {
        return NextResponse.json(
          { error: { message: "Invalid year" } },
          { status: 400 }
        );
      }
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y + 1, 0, 1));

      if (GROUP === "month") {
        const rows = await prisma.$queryRaw`
          SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
                 COUNT(*)                   AS pageviews,
                 COUNT(DISTINCT session_id) AS sessions,
                 COUNT(DISTINCT visitor_id) AS visitors
          FROM analytics_pageviews
          WHERE created_at >= ${start} AND created_at < ${end}
          GROUP BY ym
          ORDER BY ym ASC
        `;

        const series = Array.from({ length: 12 }, (_, i) => {
          const key = `${y}-${String(i + 1).padStart(2, "0")}`;
          const r = rows.find((x) => x.ym === key);
          return {
            bucket: key,
            pageviews: Number(r?.pageviews || 0),
            sessions: Number(r?.sessions || 0),
            visitors: Number(r?.visitors || 0),
          };
        });
        return NextResponse.json({ series, label: String(y) });
      }

      // Daily for a year — force string 'YYYY-MM-DD'
      const rows = await prisma.$queryRaw`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS bucket,
               COUNT(*)                   AS pageviews,
               COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE created_at >= ${start} AND created_at < ${end}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const series = rows.map((r) => ({
        bucket: String(r.bucket), // already 'YYYY-MM-DD'
        pageviews: Number(r.pageviews || 0),
        sessions: Number(r.sessions || 0),
        visitors: Number(r.visitors || 0),
      }));
      return NextResponse.json({ series, label: String(y) });
    }

    // ===== Flexible mode: start/end or period/days =====
    let start, end, label;
    if (startParam && endParam) {
      start = new Date(`${startParam}T00:00:00Z`);
      end = new Date(`${endParam}T00:00:00Z`);
      label = `${startParam} s.d. ${endParam}`;
    } else if (daysParam && !periodParam) {
      const n = Math.min(365, Math.max(1, Number(daysParam || 30)));
      end = new Date();
      start = new Date(Date.now() - n * 24 * 3600 * 1000);
      label = `${n}d (${toISODate(start)} s.d. ${toISODate(end)})`;
    } else {
      const pr = parsePeriod(periodParam || "30d");
      start = pr.start;
      end = pr.end;
      label = `${pr.label} (${toISODate(start)} s.d. ${toISODate(end)})`;
    }

    // group expr — make day always a string 'YYYY-MM-DD'
    const groupExpr =
      GROUP_EXPRESSIONS[GROUP] ?? GROUP_EXPRESSIONS.day;

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT ${groupExpr} AS bucket,
               COUNT(*)                   AS pageviews,
               COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE created_at >= ${start} AND created_at < ${end}
        GROUP BY bucket
        ORDER BY bucket ASC
      `
    );

    const series = rows.map((r) => ({
      bucket: serializeBucket(r.bucket),
      pageviews: Number(r.pageviews || 0),
      sessions: Number(r.sessions || 0),
      visitors: Number(r.visitors || 0),
    }));

    return NextResponse.json({
      series,
      group: GROUP,
      start: toISODate(start),
      end: toISODate(end),
      label,
    });
  } catch (e) {
    return NextResponse.json(
      { error: { message: e?.message || "Analytics error" } },
      { status: 500 }
    );
  }
}
