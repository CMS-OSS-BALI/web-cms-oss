import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/* utils sama seperti punyamu */
function sanitize(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v);
    return out;
  }
  return value;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email)
    throw new Error("UNAUTHORIZED");
  return session.user;
}

function parseSort(sort) {
  if (!sort) return { created_at: "desc" };
  const [field, dir] = sort.split(":");
  const direction = dir?.toLowerCase() === "asc" ? "asc" : "desc";
  const allowed = new Set(["created_at", "full_name", "email"]);
  return allowed.has(field) ? { [field]: direction } : { created_at: "desc" };
}
function parseBigInt(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    const n = BigInt(value);
    return n < 0 ? null : n;
  } catch {
    return null;
  }
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* =========================
   GET /api/leads
   ========================= */
export async function GET(req) {
  try {
    await assertAdmin();
  } catch {
    return json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const education = searchParams.get("education") || undefined;

  const assignedToRaw = searchParams.get("assigned_to");
  const onlyAssigned = searchParams.get("only_assigned") === "1";
  const includeAssigned = searchParams.get("include_assigned") === "1";
  const assignedTo = parseBigInt(assignedToRaw);
  if (assignedToRaw && assignedTo === null) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "assigned_to must be a positive integer",
        },
      },
      { status: 422 }
    );
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const withDeleted = searchParams.get("with_deleted") === "1";
  const onlyDeleted = searchParams.get("only_deleted") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
  );
  const orderBy = parseSort(searchParams.get("sort"));

  // ⚠️ HILANGKAN mode: 'insensitive' (MySQL tak mendukung)
  const where = {
    ...(q && {
      OR: [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { whatsapp: { contains: q } },
        { domicile: { contains: q } },
      ],
    }),
    ...(education && { education_last: education }),
    ...(from || to
      ? {
          created_at: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null }),
    ...(assignedTo !== null
      ? { assigned_to: assignedTo }
      : onlyAssigned
      ? { NOT: { assigned_to: null } }
      : includeAssigned
      ? {}
      : { assigned_to: null }),
  };

  const [total, rows] = await Promise.all([
    prisma.leads.count({ where }),
    prisma.leads.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        full_name: true,
        domicile: true,
        whatsapp: true,
        email: true,
        education_last: true,
        assigned_to: true,
        assigned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);

  return json({ data: rows, meta: { page, perPage, total } });
}

/* =========================
   POST /api/leads (punyamu)
   ========================= */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const {
    full_name,
    domicile = null,
    whatsapp = null,
    email = null,
    education_last = null,
    assigned_to = null,
    assigned_at = null,
  } = body || {};

  if (
    !full_name ||
    typeof full_name !== "string" ||
    full_name.trim().length < 2
  ) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "full_name is required (min 2 chars)",
        },
      },
      { status: 422 }
    );
  }
  if (email && typeof email !== "string") {
    return json(
      {
        error: { code: "VALIDATION_ERROR", message: "email must be a string" },
      },
      { status: 422 }
    );
  }

  const assignedToValue = parseBigInt(assigned_to);
  if (assigned_to && assignedToValue === null) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "assigned_to must be a positive integer",
        },
      },
      { status: 422 }
    );
  }

  const assignedAtValue = parseDate(assigned_at);
  if (assigned_at && assignedAtValue === null) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "assigned_at must be a valid ISO date",
        },
      },
      { status: 422 }
    );
  }

  const created = await prisma.leads.create({
    data: {
      full_name: full_name.trim(),
      domicile,
      whatsapp,
      email,
      education_last,
      assigned_to: assignedToValue,
      assigned_at: assignedAtValue,
    },
    select: {
      id: true,
      full_name: true,
      domicile: true,
      whatsapp: true,
      email: true,
      education_last: true,
      assigned_to: true,
      assigned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return json(created, { status: 201 });
}
