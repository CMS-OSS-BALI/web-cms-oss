// app/api/consultants/[id]/program-images/[imageId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET =
  process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "";

const ok = (b, i) => NextResponse.json(b, i);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
}

function parseId(raw) {
  const s = String(raw ?? "").trim();
  return s || null;
}
function stripBucket(p) {
  if (!p) return null;
  return String(p)
    .replace(new RegExp(`^${BUCKET}/`), "")
    .replace(/^\/+/, "");
}

export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (e) {
    return ok({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const consultantId = parseId(params?.id);
  const imageId = parseId(params?.imageId);
  if (!consultantId || !imageId)
    return ok({ error: { code: "BAD_ID" } }, { status: 400 });

  // ambil dulu path utk dihapus dari storage
  const row = await prisma.consultant_program_images.findFirst({
    where: { id: imageId, id_consultant: consultantId },
    select: { image_url: true },
  });
  if (!row) return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // hapus row
    await tx.consultant_program_images.delete({
      where: { id: imageId },
    });

    // rapikan sort
    const rest = await tx.consultant_program_images.findMany({
      where: { id_consultant: consultantId },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    // reindex
    for (let i = 0; i < rest.length; i++) {
      await tx.consultant_program_images.update({
        where: { id: rest[i].id },
        data: { sort: i },
      });
    }
  });

  // hapus file dari storage (best-effort)
  try {
    if (supabaseAdmin && BUCKET) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([stripBucket(row.image_url)]);
    }
  } catch {}

  return new NextResponse(null, { status: 204 });
}
