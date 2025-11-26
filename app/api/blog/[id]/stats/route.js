// app/api/blog/[id]/stats/route.js
import { json } from "@/app/api/blog/_utils";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST body:
 *   { "type": "view" | "like", "inc": 1 }
 * Public-safe increment counter secara atomik + clamp.
 */
export async function POST(req, { params }) {
  try {
    const id = params?.id;
    if (!id)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter id blog wajib diisi.",
            field: "id",
          },
        },
        { status: 400 }
      );

    const body = await req.json().catch(() => ({}));
    const type = body?.type === "like" ? "like" : "view";
    const rawInc = parseInt(body?.inc ?? "1", 10);
    const inc = Number.isFinite(rawInc) ? Math.max(1, Math.min(rawInc, 50)) : 1; // hard cap 50

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

    return json({ ok: true, data: updated });
  } catch (err) {
    console.error("POST /api/blog/[id]/stats error:", err);
    return json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
