// /app/api/events/years/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(d, i) {
  return NextResponse.json(d, i);
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const category_id =
      (url.searchParams.get("category_id") || "").trim() || null;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

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

    const rows = await prisma.events.findMany({
      where: whereEvent,
      select: { start_at: true },
      orderBy: { start_at: "desc" },
    });

    const years = Array.from(
      new Set(
        rows
          .map((r) =>
            r.start_at ? new Date(r.start_at).getUTCFullYear() : null
          )
          .filter((y) => Number.isFinite(y))
      )
    ).sort((a, b) => b - a);

    return json({ message: "OK", data: years });
  } catch (e) {
    console.error("GET /api/events/years error:", e);
    return json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch years" } },
      { status: 500 }
    );
  }
}
