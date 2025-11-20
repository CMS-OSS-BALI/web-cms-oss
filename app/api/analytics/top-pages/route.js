import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/requestUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAuthorized(req) {
  const headerKey = (req.headers.get("x-analytics-key") || "").trim();
  const envKey = (process.env.ANALYTICS_READ_KEY || "").trim();
  if (envKey && headerKey && headerKey === envKey) return true;

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (admin) return true;
  }
  return false;
}

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
    const ip = getClientIp(req);
    const rate = consumeRateLimit(`analytics-top-pages:${ip}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!rate.success) {
      return NextResponse.json(
        { error: { message: "rate_limited" } },
        { status: 429 }
      );
    }

    const allowed = await ensureAuthorized(req);
    if (!allowed) {
      return NextResponse.json(
        { error: { message: "unauthorized" } },
        { status: 401 }
      );
    }

    const { start, end } = parsePeriod(period);

    // When prefix provided, add WHERE path LIKE 'prefix%'
    const conditions = [
      Prisma.sql`created_at >= ${start}`,
      Prisma.sql`created_at < ${end}`,
    ];
    if (prefix) {
      conditions.push(Prisma.sql`path LIKE ${`${prefix}%`}`);
    }

    // Safely join conditions with AND to avoid malformed SQL
    const whereClause = conditions.reduce(
      (acc, cond) => (acc ? Prisma.sql`${acc} AND ${cond}` : cond),
      null
    );

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT path,
               COUNT(*)                   AS pageviews,
               COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM analytics_pageviews
        WHERE ${whereClause}
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
