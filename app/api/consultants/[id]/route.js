import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

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

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const item = await prisma.consultants.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      whatsapp: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!item) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return json(item);
}

export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = typeof body.name === "string" ? body.name.trim() : body.name;
    if (typeof name !== "string" || name.length < 2) {
      return json(
        { error: { code: "VALIDATION_ERROR", message: "name min 2 chars" } },
        { status: 422 }
      );
    }
    data.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    data.email = body.email ? String(body.email).trim() || null : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "whatsapp")) {
    data.whatsapp = body.whatsapp ? String(body.whatsapp).trim() || null : null;
  }

  if (!Object.keys(data).length) {
    return json({ error: { code: "NO_CHANGES" } }, { status: 400 });
  }

  data.updated_at = new Date();

  try {
    const updated = await prisma.consultants.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        whatsapp: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });
    return json(updated);
  } catch (err) {
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.join?.(", ") || "unique";
      return json(
        { error: { code: "CONFLICT", message: `${field} already in use` } },
        { status: 409 }
      );
    }
    return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  try {
    await prisma.consultants.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}
