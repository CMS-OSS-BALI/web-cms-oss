// app/api/previous-event-photos/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ========== Helpers URL publik ========== */

function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  return base;
}

function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;

  const base = computePublicBase();
  const path = s.replace(/^\/+/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* ========== Auth Helper ========== */

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    const err = new Error("UNAUTHORIZED");
    err.code = 401;
    throw err;
  }
  const admin = await prisma.admin_users.findUnique({
    where: { email },
  });
  if (!admin) {
    const err = new Error("FORBIDDEN");
    err.code = 403;
    throw err;
  }
  return admin;
}

/* ===================== GET: detail ===================== */
/**
 * Public (biasa dipakai modal detail di admin / slider).
 */
export async function GET(_req, { params }) {
  try {
    const { id } = params;
    const data = await prisma.previous_event_photos.findUnique({
      where: { id },
    });
    if (!data || data.deleted_at) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const resp = NextResponse.json({
      data: {
        ...data,
        image_public_url: toPublicUrl(data.image_url),
      },
    });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (err) {
    console.error("GET /api/previous-event-photos/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ===================== PATCH: update meta ===================== */
/**
 * Admin only.
 * Body: JSON
 * - is_published?: boolean
 */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const dataUpdate = {};
    if (typeof body.is_published === "boolean") {
      dataUpdate.is_published = body.is_published;
    }

    if (Object.keys(dataUpdate).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang diupdate." },
        { status: 400 }
      );
    }

    const updated = await prisma.previous_event_photos.update({
      where: { id },
      data: dataUpdate,
    });

    const resp = NextResponse.json({
      data: {
        ...updated,
        image_public_url: toPublicUrl(updated.image_url),
      },
    });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (err) {
    console.error("PATCH /api/previous-event-photos/[id] error:", err);
    const code = err.code || 500;
    const msg =
      err.code === 401
        ? "Unauthorized"
        : err.code === 403
        ? "Forbidden"
        : "Internal server error";
    return NextResponse.json({ error: msg }, { status: code });
  }
}

/* ===================== DELETE: soft delete ===================== */
/**
 * Admin only.
 * Soft delete → set deleted_at = now()
 * (Tidak menghapus file di storage; sama kayak testimonials)
 */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;

    const deleted = await prisma.previous_event_photos.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
      select: { id: true, deleted_at: true },
    });

    return NextResponse.json({ data: deleted });
  } catch (err) {
    console.error("DELETE /api/previous-event-photos/[id] error:", err);
    const code = err.code || 500;
    const msg =
      err.code === 401
        ? "Unauthorized"
        : err.code === 403
        ? "Forbidden"
        : "Internal server error";
    return NextResponse.json({ error: msg }, { status: code });
  }
}
