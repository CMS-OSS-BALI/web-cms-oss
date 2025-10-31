import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // sendBeacon sering pakai text/plain
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const { path, referrer, visitor_id, session_id } = body || {};
    if (!path || !visitor_id || !session_id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ua = req.headers.get("user-agent")?.slice(0, 250) ?? null;

    await prisma.analytics_pageviews.create({
      data: {
        path: String(path).slice(0, 250),
        referrer: referrer ? String(referrer).slice(0, 250) : null,
        user_agent: ua,
        visitor_id: String(visitor_id).slice(0, 64),
        session_id: String(session_id).slice(0, 64),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
