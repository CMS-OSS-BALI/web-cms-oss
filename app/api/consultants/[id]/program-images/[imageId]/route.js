// app/api/consultants/[id]/program-images/[imageId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import storageClient from "@/app/utils/storageClient";
import { cropFileTo16x9Webp } from "@/app/utils/cropper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Basic helpers
========================= */
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
   URL -> storage key
   (harus konsisten dengan file [id]/route.js)
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
   Upload + crop 16:9 helper
========================= */
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const PUBLIC_PREFIX = "cms-oss";

async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
}

/**
 * Crop ke rasio 16:9 (WebP) lalu upload ke storage.
 * Dipakai untuk UPDATE satu gambar program.
 */
async function uploadProgramImage16x9(file, consultantId) {
  await assertImageFileOrThrow(file);

  // crop 16:9 → WebP (di server: pakai sharp)
  const { file: croppedFile } = await cropFileTo16x9Webp(file, {
    width: 1280, // boleh diubah kalau mau
    quality: 90,
  });

  const res = await storageClient.uploadBufferWithPresign(croppedFile, {
    folder: `${PUBLIC_PREFIX}/consultants/${consultantId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/* =========================
   PUT/PATCH /api/consultants/:id/program-images/:imageId
   - Ganti file gambar untuk satu program image
   - Otomatis crop 16:9 sebelum upload
========================= */
export async function PUT(req, { params }) {
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

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return ok(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Gunakan multipart/form-data dengan field file.",
        },
      },
      { status: 415 }
    );
  }

  const form = await req.formData();
  const file =
    form.get("file") && typeof form.get("file") !== "string"
      ? form.get("file")
      : form.get("image") && typeof form.get("image") !== "string"
      ? form.get("image")
      : null;

  if (!file) {
    return ok(
      {
        error: {
          code: "NO_FILE",
          message: "Field file (atau image) wajib diisi.",
        },
      },
      { status: 422 }
    );
  }

  // Pastikan row-nya ada dulu
  const existing = await prisma.consultant_program_images.findFirst({
    where: { id: imageId, id_consultant: consultantId },
    select: { id: true, image_url: true, sort: true },
  });
  if (!existing) {
    return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  let newUrl;
  try {
    newUrl = await uploadProgramImage16x9(file, consultantId);
  } catch (e) {
    if (e?.message === "PAYLOAD_TOO_LARGE") {
      return ok(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Maksimal 10MB" } },
        { status: 413 }
      );
    }
    if (e?.message === "UNSUPPORTED_TYPE") {
      return ok(
        {
          error: {
            code: "UNSUPPORTED_TYPE",
            message: "Format harus JPEG/PNG/WebP",
          },
        },
        { status: 415 }
      );
    }
    console.error("upload program image 16:9 error:", e);
    return ok({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }

  // Update DB
  await prisma.consultant_program_images.update({
    where: { id: imageId },
    data: {
      image_url: newUrl,
      updated_at: new Date(),
    },
  });

  // Bersihkan file lama (best-effort)
  try {
    if (existing.image_url && existing.image_url !== newUrl) {
      await removeStorageObjects([existing.image_url]);
    }
  } catch {
    // abaikan error cleanup
  }

  return ok(
    {
      data: {
        id: imageId,
        id_consultant: consultantId,
        image_url: newUrl,
        sort: existing.sort,
      },
    },
    { status: 200 }
  );
}

// PATCH → alias ke PUT
export async function PATCH(req, ctx) {
  return PUT(req, ctx);
}

/* =========================
   DELETE /api/consultants/:id/program-images/:imageId
   (tetap sama, hanya hapus + reindex sort)
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
