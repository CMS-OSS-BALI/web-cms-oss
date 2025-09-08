// app/api/partners/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });

  if (
    session.user.role &&
    String(session.user.role).toUpperCase() === "ADMIN"
  ) {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!admin) throw new Response("Forbidden", { status: 403 });
    return { session, adminId: admin.id };
  }
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { session, adminId: admin.id };
}

// Bikin slug unik saat update, sambil mengecualikan record ini sendiri
async function uniqueSlugForUpdate(base, excludeId) {
  let candidate = slugify(base);
  let i = 1;
  while (true) {
    const exists = await prisma.partners.findFirst({
      where: { slug: candidate, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (!exists) return candidate;
    i += 1;
    candidate = `${slugify(base)}-${i}`;
  }
}

/* ---------- GET /api/partners/:id ---------- */
export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    const row = await prisma.partners.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error(`GET /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch partner" },
      { status: 500 }
    );
  }
}

/* ---------- PATCH /api/partners/:id ---------- */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;

    const body = await req.json();

    // jaga slug unik saat rename
    let slug;
    if (body.slug || body.name) {
      const desiredBase = body.slug || body.name;
      slug = await uniqueSlugForUpdate(desiredBase, id);
    }

    const updated = await prisma.partners.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(slug && { slug }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.type !== undefined && {
          type: body.type ? String(body.type).toUpperCase() : null,
        }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.mou_url !== undefined && { mou_url: body.mou_url }),
        ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.postal_code !== undefined && {
          postal_code: body.postal_code,
        }),
        ...(body.tuition_min !== undefined && {
          tuition_min: body.tuition_min,
        }),
        ...(body.tuition_max !== undefined && {
          tuition_max: body.tuition_max,
        }),
        ...(body.living_cost_estimate !== undefined && {
          living_cost_estimate: body.living_cost_estimate,
        }),
        ...(body.currency !== undefined && {
          currency: body.currency
            ? String(body.currency).toUpperCase().slice(0, 3)
            : null,
        }),
        ...(body.contact !== undefined && { contact: body.contact }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err?.status) return err;
    console.error(`PATCH /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update partner" },
      { status: 500 }
    );
  }
}

/* ---------- DELETE /api/partners/:id (soft) ---------- */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;

    const deleted = await prisma.partners.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json({ message: "deleted", data: deleted });
  } catch (err) {
    if (err?.status) return err;
    console.error(`DELETE /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete partner" },
      { status: 500 }
    );
  }
}
