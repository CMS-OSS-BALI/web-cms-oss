// app/api/programs/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

/* ========= GET /api/programs/:id  (DETAIL) ========= */
export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    const item = await prisma.programs.findFirst({
      where: { id, deleted_at: null },
    });
    return item ? NextResponse.json({ data: item }) : notFound();
  } catch (err) {
    console.error(`GET /api/programs/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch program" },
      { status: 500 }
    );
  }
}

/* ========= PATCH|PUT /api/programs/:id  (UPDATE) ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const body = await req.json();

    const data = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = body.description ?? null;
    if (body.image_url !== undefined) data.image_url = body.image_url ?? null;

    if (body.program_category !== undefined) {
      if (!["B2B", "B2C"].includes(body.program_category)) {
        return badRequest("program_category harus 'B2B' atau 'B2C'");
      }
      data.program_category = body.program_category;
    }

    if (body.price !== undefined) {
      const p =
        body.price === null || body.price === undefined
          ? null
          : parseInt(body.price, 10);
      if (p !== null && (!Number.isFinite(p) || p < 0))
        return badRequest("price harus bilangan bulat >= 0");
      data.price = p;
    }

    if (body.phone !== undefined) data.phone = body.phone ?? null;
    if (body.is_published !== undefined)
      data.is_published = !!body.is_published;
    data.updated_at = new Date();

    const updated = await prisma.programs.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(`PATCH /api/programs/${params?.id} error:`, e);
    if (e.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to update program" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/programs/:id  (SOFT DELETE) ========= */
export async function DELETE(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const deleted = await prisma.programs.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_published: false,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ data: deleted });
  } catch (e) {
    console.error(`DELETE /api/programs/${params?.id} error:`, e);
    if (e.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to delete program" },
      { status: 500 }
    );
  }
}
