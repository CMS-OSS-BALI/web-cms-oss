// app/api/programs/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  return v === true || v === "true" || v === "1";
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "price", "name"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
async function getAdminUserId(req, body) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return req.headers.get("x-admin-user-id") || body?.admin_user_id || null;
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}

/* ========= GET /api/programs  (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category") || undefined;
    const published = parseBool(searchParams.get("published"));
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 10))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const where = {
      deleted_at: null,
      ...(category ? { program_category: category } : {}),
      ...(published !== undefined ? { is_published: published } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.programs.count({ where }),
      prisma.programs.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          admin_user_id: true,
          name: true,
          description: true,
          image_url: true,
          program_category: true,
          price: true,
          phone: true,
          is_published: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (err) {
    console.error("GET /api/programs error:", err);
    return NextResponse.json(
      { message: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/programs  (CREATE) ========= */
export async function POST(req) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name wajib diisi");

    const program_category = body?.program_category;
    if (!["B2B", "B2C"].includes(program_category)) {
      return badRequest("program_category harus 'B2B' atau 'B2C'");
    }

    const price =
      body?.price === null || body?.price === undefined
        ? null
        : asInt(body.price, NaN);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return badRequest("price harus bilangan bulat >= 0");
    }

    const adminUserId = await getAdminUserId(req, body);
    if (!adminUserId) {
      return NextResponse.json(
        {
          message:
            "admin_user_id tidak ditemukan (pastikan sudah login & session.user.id tersedia)",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const created = await prisma.programs.create({
      data: {
        id: randomUUID(),
        admin_user_id: adminUserId,
        name,
        description: body?.description ?? null,
        image_url: body?.image_url ?? null,
        program_category,
        price,
        phone: body?.phone ?? null,
        is_published: Boolean(body?.is_published ?? false),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/programs error:", err);
    return NextResponse.json(
      { message: "Failed to create program" },
      { status: 500 }
    );
  }
}
