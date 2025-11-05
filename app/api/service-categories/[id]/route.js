import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* Auth */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

function truthy(param) {
  if (param == null) return false;
  const v = String(param).toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}
function includeCountsFromReq(req) {
  try {
    const url = new URL(req.url);
    return truthy(url.searchParams.get("include_counts"));
  } catch {
    return false;
  }
}

async function getCategoryByIdOrSlug(idOrSlug, withCounts = false) {
  const base = withCounts
    ? { include: { _count: { select: { services: true } } } }
    : {};
  const byId = await prisma.service_categories.findUnique({
    where: { id: idOrSlug },
    ...base,
  });
  if (byId) return byId;
  return prisma.service_categories.findUnique({
    where: { slug: idOrSlug },
    ...base,
  });
}

/* GET detail */
export async function GET(req, { params }) {
  try {
    const withCounts = includeCountsFromReq(req);
    const cat = await getCategoryByIdOrSlug(params.id, withCounts);
    if (!cat)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        ...(withCounts ? { services_count: cat._count?.services ?? 0 } : {}),
      },
    });
  } catch (e) {
    console.error("GET /api/service-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* PUT update */
export async function PUT(req, { params }) {
  try {
    await assertAdmin();

    const body = await req.json().catch(() => ({}));
    const existing = await getCategoryByIdOrSlug(params.id, false);
    if (!existing)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const patch = {};
    if (body.name !== undefined) {
      const name = String(body.name || "")
        .trim()
        .slice(0, 150);
      if (!name)
        return NextResponse.json(
          { message: "name tidak boleh kosong" },
          { status: 422 }
        );
      patch.name = name;
    }
    if (body.slug !== undefined) {
      const slug = String(body.slug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (!slug)
        return NextResponse.json(
          { message: "Slug tidak valid" },
          { status: 422 }
        );
      patch.slug = slug;
    }
    if (!Object.keys(patch).length)
      return NextResponse.json(
        { message: "Tidak ada perubahan" },
        { status: 400 }
      );

    const updated = await prisma.service_categories.update({
      where: { id: existing.id },
      data: patch,
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (e) {
    if (e?.code === "P2002")
      return NextResponse.json(
        { message: "Slug sudah dipakai" },
        { status: 409 }
      );
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    console.error("PUT /api/service-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* DELETE */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const existing = await getCategoryByIdOrSlug(params.id, false);
    if (!existing)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const deleted = await prisma.service_categories.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ data: deleted });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("DELETE /api/service-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
