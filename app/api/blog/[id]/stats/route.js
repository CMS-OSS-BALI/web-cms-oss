// app/api/blog/[id]/stats/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST body:
 *   { "type": "view" | "like", "inc": 1 }
 * Public-safe increment counter secara atomik.
 */
export async function POST(req, { params }) {
  try {
    const id = params?.id;
    const body = await req.json().catch(() => ({}));
    const type = body?.type === "like" ? "like" : "view";
    const inc = Math.max(1, parseInt(body?.inc ?? "1", 10));

    const data =
      type === "like"
        ? { likes_count: { increment: inc } }
        : { views_count: { increment: inc } };

    const updated = await prisma.blog.update({
      where: { id },
      data,
      select: {
        id: true,
        views_count: true,
        likes_count: true,
        updated_at: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/blog/[id]/stats error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
