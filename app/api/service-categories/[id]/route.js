import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* =============== Auth Helper =============== */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

/* =============== Utils =============== */
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
function slugify(input) {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
async function readBody(req) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const body = {};
    for (const key of form.keys()) body[key] = form.get(key);
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/** Resolve by id OR slug (keduanya unique) */
async function getCategoryByIdOrSlug(idOrSlug, withCounts = false) {
  const base = {
    ...(withCounts
      ? { include: { _count: { select: { services: true } } } }
      : {}),
  };

  const byId = await prisma.service_categories.findUnique({
    where: { id: idOrSlug },
    ...base,
  });
  if (byId) return byId;

  const bySlug = await prisma.service_categories.findUnique({
    where: { slug: idOrSlug },
    ...base,
  });
  return bySlug;
}

/* =============== GET (detail) =============== */
export async function GET(req, { params }) {
  try {
    const withCounts = includeCountsFromReq(req);
    const cat = await getCategoryByIdOrSlug(params.id, withCounts);

    if (!cat) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

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

/* =============== PUT (update) =============== */
export async function PUT(req, { params }) {
  try {
    await assertAdmin();

    const body = await readBody(req);
    const existing = await getCategoryByIdOrSlug(params.id, false);
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const patch = {};

    if (body.name !== undefined) {
      const name = String(body.name || "")
        .trim()
        .slice(0, 150);
      if (!name) {
        return NextResponse.json(
          { message: "name tidak boleh kosong" },
          { status: 422 }
        );
      }
      patch.name = name;
      if (body.slug === undefined) {
        const autoSlug = slugify(name);
        if (!autoSlug) {
          return NextResponse.json(
            { message: "Slug tidak valid (hasil slugify kosong)" },
            { status: 422 }
          );
        }
        patch.slug = autoSlug;
      }
    }

    if (body.slug !== undefined) {
      const cleaned = String(body.slug || "").trim();
      const newSlug = slugify(cleaned);
      if (!newSlug) {
        return NextResponse.json(
          { message: "Slug tidak valid (hasil slugify kosong)" },
          { status: 422 }
        );
      }
      patch.slug = newSlug;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { message: "Tidak ada perubahan" },
        { status: 400 }
      );
    }

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
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "Slug sudah dipakai" },
        { status: 409 }
      );
    }
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    console.error("PUT /api/service-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* =============== DELETE (hard delete) =============== */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();

    const existing = await getCategoryByIdOrSlug(params.id, false);
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

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
