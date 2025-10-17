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
function getLimitFromReq(req, fallback = 20) {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit"));
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.trunc(n) : fallback;
  } catch {
    return fallback;
  }
}
function getPageFromReq(req, fallback = 1) {
  try {
    const n = Number(new URL(req.url).searchParams.get("page"));
    return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : fallback;
  } catch {
    return fallback;
  }
}
function getQuery(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("q") || "").trim();
  } catch {
    return "";
  }
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

/* =============== GET (list) =============== */
// NOTE: response hanya { data: [...] } (tanpa meta)
export async function GET(req) {
  try {
    const q = getQuery(req);
    const limit = getLimitFromReq(req, 20);
    const page = getPageFromReq(req, 1);
    const skip = (page - 1) * limit;
    const withCounts = includeCountsFromReq(req);

    const where = q
      ? {
          OR: [
            { slug: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const rows = await prisma.service_categories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...(withCounts
        ? { include: { _count: { select: { services: true } } } }
        : {}),
    });

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ...(withCounts ? { services_count: r._count?.services ?? 0 } : {}),
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/service-categories error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* =============== POST (create) =============== */
export async function POST(req) {
  try {
    await assertAdmin();

    const body = await readBody(req);
    const rawName = (body.name || "").toString().trim();
    const candidateSlug = (body.slug || body.title || "").toString().trim();

    if (!rawName) {
      return NextResponse.json(
        { message: "name wajib diisi" },
        { status: 422 }
      );
    }
    const name = rawName.slice(0, 150);
    const slug = slugify(candidateSlug || name);
    if (!slug) {
      return NextResponse.json(
        { message: "Slug tidak valid (hasil slugify kosong)" },
        { status: 422 }
      );
    }

    const created = await prisma.service_categories.create({
      data: { name, slug },
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
      },
      { status: 201 }
    );
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

    console.error("POST /api/service-categories error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
