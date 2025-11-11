// app/api/consultants/[id]/program-images/[imageId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

/* =========================
   URL -> storage key (lihat penjelasan di file [id]/route.js)
========================= */
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, "");
  const idx = s.indexOf("/public/");
  if (idx >= 0) return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  return null;
}

/* =========================
   Best-effort remover (batch)
========================= */
async function removeStorageObjects(urlsOrKeys = []) {
  const keys = urlsOrKeys.map(toStorageKey).filter(Boolean);
  if (!keys.length) return;

  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return;

  try {
    const res = await fetch(`${base}/api/storage/remove`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
      },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      await fetch(`${base}/api/storage/delete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
        },
        body: JSON.stringify({ keys }),
      }).catch(() => {});
    }
  } catch (_) {}
}

/* =========================
   DELETE /api/consultants/:id/program-images/:imageId
========================= */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (e) {
    return ok({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const consultantId = parseId(params?.id);
  const imageId = parseId(params?.imageId);
  if (!consultantId || !imageId) {
    return ok({ error: { code: "BAD_ID" } }, { status: 400 });
  }

  // Ambil dulu URL untuk dibersihkan setelah DB sukses dihapus
  const row = await prisma.consultant_program_images.findFirst({
    where: { id: imageId, id_consultant: consultantId },
    select: { image_url: true },
  });
  if (!row) {
    return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  // Hapus row + reindex sort di satu transaksi
  await prisma.$transaction(async (tx) => {
    await tx.consultant_program_images.delete({ where: { id: imageId } });

    const rest = await tx.consultant_program_images.findMany({
      where: { id_consultant: consultantId },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    // Reindex sederhana & jelas
    for (let i = 0; i < rest.length; i++) {
      await tx.consultant_program_images.update({
        where: { id: rest[i].id },
        data: { sort: i },
      });
    }
  });

  // Bersihkan file di storage (best-effort, non-blocking)
  try {
    await removeStorageObjects([row.image_url]);
  } catch {
    // abaikan error cleanup
  }

  return new NextResponse(null, { status: 204 });
}
