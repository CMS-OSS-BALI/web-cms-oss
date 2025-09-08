// app/api/partners/route.js
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
async function ensureUniqueSlug(base) {
  let slug = slugify(base);
  let i = 1;
  // cek sampai unik
  // (loop dengan base, base-2, base-3, ...)
  // catatan: tidak pernah menghasilkan base-1 (sesuai versi kamu)
  while (true) {
    const exists = await prisma.partners
      .findUnique({ where: { slug } })
      .catch(() => null);
    if (!exists) return slug;
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
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

/* ---------- GET /api/partners ---------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("perPage") || 10))
    );
    const q = searchParams.get("q") || "";
    const country = searchParams.get("country") || undefined;
    const rawType = searchParams.get("type") || undefined;
    const type = rawType ? String(rawType).toUpperCase() : undefined; // DOMESTIC|FOREIGN

    const where = {
      deleted_at: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { state: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(country ? { country } : {}),
      ...(type ? { type } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.partners.count({ where }),
      prisma.partners.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      data,
    });
  } catch (err) {
    console.error("GET /api/partners error:", err);
    return NextResponse.json(
      { message: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}

/* ---------- POST /api/partners ---------- */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin();

    const b = await req.json();
    const { name } = b || {};
    if (!name) {
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );
    }

    const slug = b.slug ? slugify(b.slug) : await ensureUniqueSlug(name);
    const normType = b.type ? String(b.type).toUpperCase() : null;
    const currency = (b.currency || "IDR").toUpperCase().slice(0, 3);
    const toNum = (v) =>
      v === "" || v === null || v === undefined
        ? null
        : Number(String(v).replace(/\./g, "").replace(/,/g, "."));

    const contact = b.contact ?? null;
    const ownerId = b.admin_user_id || adminId;
    if (!ownerId) {
      return NextResponse.json(
        { message: "admin_user_id required" },
        { status: 400 }
      );
    }

    const created = await prisma.partners.create({
      data: {
        name,
        slug,
        country: b.country ?? null,
        type: normType,
        website: b.website ?? null,
        mou_url: b.mou_url ?? null,
        logo_url: b.logo_url ?? null,
        description: b.description ?? null,
        address: b.address ?? null,
        city: b.city ?? null,
        state: b.state ?? null,
        postal_code: b.postal_code ?? null,
        tuition_min: toNum(b.tuition_min),
        tuition_max: toNum(b.tuition_max),
        living_cost_estimate: toNum(b.living_cost_estimate),
        currency,
        contact,
        created_at: new Date(),
        updated_at: new Date(),
        admin_users: { connect: { id: ownerId } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err?.status) return err;
    console.error("POST /api/partners error:", err);
    return NextResponse.json(
      { message: "Failed to create partner" },
      { status: 500 }
    );
  }
}
