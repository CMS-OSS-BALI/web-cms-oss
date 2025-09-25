import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

const DEFAULT_ORDER = { created_at: "desc" };

function sanitize(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) out[key] = sanitize(val);
    return out;
  }
  return value;
}

function json(body, init) {
  return NextResponse.json(sanitize(body), init);
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}

function handleAuthError(err) {
  const status = err?.status === 401 ? 401 : 403;
  return json(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status }
  );
}

function normalizeOrder(sort) {
  if (!sort) return DEFAULT_ORDER;
  const [field = "", dir = ""] = sort.split(":");
  const allowed = new Set(["created_at", "name", "email"]);
  if (!allowed.has(field)) return DEFAULT_ORDER;
  const direction = dir.toLowerCase() === "asc" ? "asc" : "desc";
  return { [field]: direction };
}

export async function GET(req) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
  );
  const orderBy = normalizeOrder(searchParams.get("sort"));

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { whatsapp: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const select = {
    id: true,
    name: true,
    whatsapp: true,
    email: true,
    created_at: true,
    updated_at: true,
  };

  const [total, rows] = await Promise.all([
    prisma.consultants.count({ where }),
    prisma.consultants.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select,
    }),
  ]);

  return json({ data: rows, meta: { page, perPage, total } });
}

export async function POST(req) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const body = await req.json().catch(() => ({}));
  const nameRaw = typeof body?.name === "string" ? body.name.trim() : "";
  if (!nameRaw || nameRaw.length < 2) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "name is required (min 2 chars)",
        },
      },
      { status: 422 }
    );
  }

  const email = body?.email ? String(body.email).trim() || null : null;
  const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() || null : null;

  try {
    const created = await prisma.consultants.create({
      data: {
        name: nameRaw,
        email,
        whatsapp,
      },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        created_at: true,
        updated_at: true,
      },
    });

    return json(created, { status: 201 });
  } catch (err) {
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.join?.(", ") || "unique";
      return json(
        {
          error: {
            code: "CONFLICT",
            message: `${field} already in use`,
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/consultants error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
