// app/api/calculator/[id]/route.js
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
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
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

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

/* ========= GET /api/calculator/:id (READ: publik) ========= */
export async function GET(_req, { params }) {
  try {
    const id = toInt(params?.id, NaN);
    if (!Number.isFinite(id)) return badRequest("Invalid id");

    const data = await prisma.calculator.findUnique({ where: { id } });
    if (!data) return notFound();

    return json({ data });
  } catch (err) {
    console.error(`GET /api/calculator/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch calculator item" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/calculator/:id (ADMIN ONLY) ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = toInt(params?.id, NaN);
    if (!Number.isFinite(id)) return badRequest("Invalid id");

    const body = await req.json().catch(() => ({}));
    const data = {};

    if (body.type !== undefined) {
      if (!ALLOWED_TYPES.includes(body.type)) return badRequest("Invalid type");
      data.type = body.type;
    }
    if (body.code !== undefined) data.code = String(body.code);
    if (body.label !== undefined) data.label = String(body.label);
    if (body.note !== undefined) data.note = body.note ?? null;
    if (body.amount_idr !== undefined)
      data.amount_idr = toInt(body.amount_idr, 0);
    if (body.is_active !== undefined) data.is_active = toBool(body.is_active);
    if (body.sort_order !== undefined)
      data.sort_order = toInt(body.sort_order, 0);

    if (Object.keys(data).length === 0)
      return badRequest("No fields to update");

    const updated = await prisma.calculator.update({ where: { id }, data });
    return json({ data: updated });
  } catch (e) {
    if (e?.code === "P2025") return notFound();
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

/* ========= DELETE /api/calculator/:id (ADMIN ONLY) ========= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin();

    const id = toInt(params?.id, NaN);
    if (!Number.isFinite(id)) return badRequest("Invalid id");

    await prisma.calculator.delete({ where: { id } });
    return json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") return notFound();
    if (e instanceof Response) return e; // from assertAdmin
    return NextResponse.json(
      { message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
