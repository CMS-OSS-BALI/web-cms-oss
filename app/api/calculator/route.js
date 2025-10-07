// app/api/calculator/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_TYPES = ["SERVICE_FEE", "INSURANCE", "VISA", "ADDON"];

/* ========= Helpers (mirip blog) ========= */
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function toInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}
function toBool(v) {
  return (
    v === true ||
    v === 1 ||
    ["1", "true", "yes", "on"].includes(String(v).toLowerCase())
  );
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

/* ========= GET /api/calculator (LIST) =========
   Query (opsional): type, q, is_active, limit (atau per_page)
   Return: langsung ARRAY data (tanpa meta) */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = (searchParams.get("q") || "").trim();
  const isActiveParam = searchParams.get("is_active");
  const limit = toInt(
    searchParams.get("limit") ?? searchParams.get("per_page"),
    0
  ); // 0 = no limit

  const where = {};
  if (type && ALLOWED_TYPES.includes(type)) where.type = type;
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { label: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
    ];
  }
  if (isActiveParam !== null) where.is_active = toBool(isActiveParam);

  const rows = await prisma.calculator.findMany({
    where,
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    ...(limit > 0 ? { take: Math.min(1000, limit) } : {}),
  });

  return json(rows);
}

/* ========= POST /api/calculator (ADMIN ONLY) =========
   Body: { type, code, label, note?, amount_idr?, is_active?, sort_order? } */
export async function POST(req) {
  try {
    await assertAdmin();

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const {
      type,
      code,
      label,
      note = null,
      amount_idr = 0,
      is_active = true,
      sort_order = 0,
    } = body || {};

    if (!ALLOWED_TYPES.includes(type || "")) return badRequest("Invalid type");
    if (!code || !label) return badRequest("code and label are required");

    const created = await prisma.calculator.create({
      data: {
        type,
        code: String(code),
        label: String(label),
        note: note ?? null,
        amount_idr: toInt(amount_idr, 0),
        is_active: toBool(is_active),
        sort_order: toInt(sort_order, 0),
      },
    });
    return json({ data: created }, { status: 201 });
  } catch (e) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "Duplicate entry: type + code must be unique" },
        { status: 409 }
      );
    }
    if (e instanceof Response) return e; // from assertAdmin
    return NextResponse.json(
      { message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
