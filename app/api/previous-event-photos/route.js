// app/api/previous-event-photos/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { cropFileTo16x9Webp } from "@/app/utils/cropper";
import storageClient from "@/app/utils/storageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===================== Konstanta ===================== */

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
// Folder dasar di storage, tapi TIDAK dipakai untuk nambah prefix di URL publik.
// Hanya untuk pengelompokan di storage gateway.
const STORAGE_FOLDER_PREFIX = "cms-oss/previous-event-photos";

/* ===================== Helpers URL publik ===================== */
/**
 * Base public URL langsung dari env.
 * Tidak diutak-atik lagi (tidak diganti jadi cdn.*, dsb).
 */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  return base;
}

/**
 * Normalisasi:
 * - Jika sudah URL penuh → return apa adanya
 * - Jika path/key → bungkus jadi `${OSS_STORAGE_BASE_URL}/public/<path>`
 */
function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (!s) return null;

  // Sudah full URL
  if (/^https?:\/\//i.test(s)) return s;

  const base = computePublicBase();
  const path = s.replace(/^\/+/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* ===================== Helpers umum ===================== */

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    const err = new Error("UNAUTHORIZED");
    err.code = 401;
    throw err;
  }
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) {
    const err = new Error("FORBIDDEN");
    err.code = 403;
    throw err;
  }
  return admin;
}

function getLimitFromReq(req, fallback = 50) {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit"));
    return Number.isFinite(n) && n > 0 && n <= 200 ? Math.trunc(n) : fallback;
  } catch {
    return fallback;
  }
}

function getPublishedFilterFromReq(req) {
  try {
    const url = new URL(req.url);
    const value = url.searchParams.get("published");
    if (value == null) return null; // tanpa filter
    const v = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) return true;
    if (["0", "false", "no", "off"].includes(v)) return false;
    return null;
  } catch {
    return null;
  }
}

/* ===================== Upload helper ===================== */
/**
 * Upload foto event:
 * - validasi type & size
 * - crop 16:9 → WebP
 * - upload via storageClient (presign)
 * - return URL publik siap pakai (dari gateway)
 */
async function uploadPreviousEventImage16x9(file, adminId) {
  if (typeof File === "undefined" || !(file instanceof File)) {
    throw new Error("NO_FILE");
  }

  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");

  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");

  // Crop → 16:9 WebP (server-side, pakai sharp)
  const processed = await cropFileTo16x9Webp(file, {
    width: 1600,
    quality: 90,
  });

  let { buffer, contentType } = processed || {};
  if (!buffer) {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } else if (buffer instanceof ArrayBuffer) {
    buffer = Buffer.from(buffer);
  } else if (ArrayBuffer.isView(buffer)) {
    buffer = Buffer.from(buffer.buffer);
  }
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!buffer?.length) throw new Error("EMPTY_FILE_BUFFER");

  const filename = `${adminId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.webp`;

  // Folder di sisi storage gateway
  const folder = `${STORAGE_FOLDER_PREFIX}/${adminId}/${new Date()
    .toISOString()
    .slice(0, 10)}`;

  const blobFile = new File([buffer], filename, {
    type: contentType || "image/webp",
  });

  const res = await storageClient.uploadBufferWithPresign(blobFile, {
    folder,
    isPublic: true,
  });

  // Gateway sudah mengembalikan URL publik (respect env, tanpa nambah prefix aneh)
  const publicUrl = res?.publicUrl || null;
  if (!publicUrl) throw new Error("UPLOAD_FAILED");
  return publicUrl;
}

/* ===================== GET: list photos ===================== */
/**
 * Public: fetch foto untuk slider / admin.
 * Query:
 * - ?published=1  → hanya yang is_published = true
 * - ?published=0  → hanya yang is_published = false
 * - ?limit=20     → batasi jumlah row
 */
export async function GET(req) {
  try {
    const limit = getLimitFromReq(req, 50);
    const published = getPublishedFilterFromReq(req);

    const where = { deleted_at: null };
    if (published !== null) where.is_published = published;

    const rows = await prisma.previous_event_photos.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const data = rows.map((r) => ({
      ...r,
      image_public_url: toPublicUrl(r.image_url),
    }));

    const resp = NextResponse.json({ data });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (err) {
    console.error("GET /api/previous-event-photos error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ===================== POST: create photo ===================== */
/**
 * Admin only.
 * Body: multipart/form-data
 * - image: File (wajib)
 * - is_published: "true"/"false"/"1"/"0"/"on" (opsional, default false)
 */
export async function POST(req) {
  try {
    const admin = await assertAdmin();

    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "Content-Type harus multipart/form-data. Di Postman pilih Body=form-data dan biarkan header otomatis.",
        },
        { status: 400 }
      );
    }

    let formData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Body form-data tidak valid." },
        { status: 400 }
      );
    }

    const file = formData.get("image");
    if (!(typeof File !== "undefined" && file instanceof File)) {
      return NextResponse.json(
        { error: 'Field "image" wajib dan harus berupa file.' },
        { status: 400 }
      );
    }

    const publishedInput = formData.get("is_published");
    const is_published =
      publishedInput === "1" ||
      publishedInput === "true" ||
      publishedInput === "yes" ||
      publishedInput === "on";

    let imageUrl;
    try {
      // Simpan URL publik dari gateway
      imageUrl = await uploadPreviousEventImage16x9(file, admin.id);
    } catch (e) {
      if (e?.message === "PAYLOAD_TOO_LARGE") {
        return NextResponse.json(
          { error: "Ukuran maksimum 10MB." },
          { status: 413 }
        );
      }
      if (e?.message === "UNSUPPORTED_TYPE") {
        return NextResponse.json(
          { error: "Format gambar harus JPEG, PNG, atau WebP." },
          { status: 415 }
        );
      }
      console.error("uploadPreviousEventImage16x9 error:", e);
      return NextResponse.json(
        { error: "Upload gambar gagal." },
        { status: 500 }
      );
    }

    const record = await prisma.previous_event_photos.create({
      data: {
        id: randomUUID(),
        admin_user_id: admin.id,
        image_url: imageUrl, // simpan URL publik langsung (atau nanti bisa diganti simpan key saja)
        is_published,
      },
    });

    const data = {
      ...record,
      image_public_url: toPublicUrl(record.image_url),
    };

    const resp = NextResponse.json({ data }, { status: 201 });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (err) {
    console.error("POST /api/previous-event-photos error:", err);
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
