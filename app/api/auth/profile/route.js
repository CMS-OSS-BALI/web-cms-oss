// app/api/auth/profile/route.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import sharp from "sharp";

// === Storage client baru (pakai 2 ENV saja)
import storageClient from "@/app/utils/storageClient";

/* -------------------- config -------------------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Simpan di jalur publik dengan prefix yang sama seperti modul lain
const PUBLIC_PREFIX = "cms-oss";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/* -------------------- public URL helpers -------------------- */
/**
 * Estimasi CDN/public base dari OSS_STORAGE_BASE_URL.
 * Jika host mengandung "storage.", kita ganti jadi "cdn." agar URL publik rapi.
 * Fallback: pakai base apa adanya.
 */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base;
  }
}

function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}

/** key/path/URL -> selalu URL publik */
function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return "";
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s; // sudah URL

  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");

  if (!base) return `/${path}`;
  // Gateway publik diekspektasi di `${BASE}/public/...`
  return `${base}/public/${path}`;
}

/* -------------------- helpers umum -------------------- */
const json = (d, init) => NextResponse.json(d, init);

async function currentAdmin(req) {
  const token = await getToken({ req, secret: NEXTAUTH_SECRET });
  const id = token?.sub || token?.userId || null;
  const email = token?.email || null;

  if (!id && !email) throw new Response("Unauthorized", { status: 401 });

  const me = await prisma.admin_users.findFirst({
    where: id ? { id: String(id) } : { email: String(email) },
    select: {
      id: true,
      name: true,
      email: true,
      no_whatsapp: true,
      profile_photo: true, // bisa key/path lama atau URL publik baru
      updated_at: true,
    },
  });

  if (!me) throw new Response("Forbidden", { status: 403 });
  return me;
}

async function readBodyAndFile(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  if (isMultipart) {
    const form = await req.formData();
    const body = {};
    let file = null;

    const candidates = ["avatar", "image", "file", "profile_photo"];
    for (const k of candidates) {
      const f = form.get(k);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue;
      body[k] = v;
    }
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/* -------------------- upload avatar (sharp + storageClient) -------------------- */
/**
 * Proses avatar menjadi square 1:1 WebP, lalu upload via presign.
 * Return: PUBLIC URL (bukan key).
 */
async function uploadAvatar1x1ToPublicUrl(
  file,
  { userId, size = 600, quality = 90 } = {}
) {
  if (!file) return null;

  // Validasi awal
  const inputSize = Number(file.size || 0);
  const inputType = String(file.type || "").toLowerCase();
  if (inputSize > MAX_FILE_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
  if (inputType && !ALLOWED_TYPES.has(inputType))
    throw new Error("UNSUPPORTED_TYPE");

  // Baca & proses ke WEBP square
  const arrayBuf = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuf);

  const outBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(Number(size) || 600, Number(size) || 600, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: Number(quality) || 90 })
    .toBuffer();

  // Buat objek pseudo-File agar utils/storageClient bisa baca name & type
  const pseudoFile = {
    name: "avatar.webp",
    type: "image/webp",
    size: outBuffer.length,
    arrayBuffer: async () => outBuffer,
  };

  const res = await storageClient.uploadBufferWithPresign(pseudoFile, {
    folder: `${PUBLIC_PREFIX}/avatars/${userId || "unknown"}`,
    isPublic: true,
  });

  // storageClient sudah mengembalikan publicUrl jika gateway menyediakannya
  // tetap normalkan via toPublicUrl sebagai fallback jika hanya key
  return res.publicUrl || toPublicUrl(res.key);
}

/* -------------------- GET profile -------------------- */
export async function GET(req) {
  try {
    const me = await currentAdmin(req);
    const resp = json({
      id: me.id,
      name: me.name,
      email: me.email,
      no_whatsapp: me.no_whatsapp,
      profile_photo: toPublicUrl(me.profile_photo), // selalu URL publik
      image_public_url: toPublicUrl(me.profile_photo), // alias legacy
      updated_at: me.updated_at,
    });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

/* -------------------- PATCH profile -------------------- */
export async function PATCH(req) {
  try {
    const me = await currentAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    // Opsi ukuran square dari body (baik multipart fields atau JSON)
    const sizeParam = Number(body?.size);
    const AVATAR_SIZE =
      Number.isFinite(sizeParam) && sizeParam >= 64 ? sizeParam : 600;

    // ── Tentukan URL publik yang akan disimpan di DB ────────────────────────────
    let photoPublicUrl = null;

    if (file) {
      photoPublicUrl = await uploadAvatar1x1ToPublicUrl(file, {
        userId: me.id,
        size: AVATAR_SIZE,
        quality: 90,
      });
    } else if (body?.profile_photo) {
      // Terima key/path atau URL lalu normalkan ke URL publik
      photoPublicUrl = toPublicUrl(String(body.profile_photo).trim());
    }

    // ── Minimal validation ─────────────────────────────────────────────────────
    if (body?.name && String(body.name).length > 191)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Name too long",
            field: "name",
          },
        },
        { status: 400 }
      );
    if (body?.no_whatsapp && String(body.no_whatsapp).length > 32)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Phone too long",
            field: "no_whatsapp",
          },
        },
        { status: 400 }
      );

    // Validasi & uniqueness email bila diubah
    let emailToSet = null;
    if (body?.email != null) {
      const e = String(body.email).trim().toLowerCase();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(e))
        return json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "Invalid email",
              field: "email",
            },
          },
          { status: 400 }
        );
      if (e !== me.email) {
        const taken = await prisma.admin_users.findUnique({
          where: { email: e },
        });
        if (taken)
          return json(
            {
              error: {
                code: "BAD_REQUEST",
                message: "Email already in use",
                field: "email",
              },
            },
            { status: 400 }
          );
        emailToSet = e;
      }
    }

    // ── Update DB: simpan URL publik di profile_photo ──────────────────────────
    const updated = await prisma.admin_users.update({
      where: { id: me.id },
      data: {
        ...(body?.name != null ? { name: String(body.name) } : {}),
        ...(body?.no_whatsapp != null
          ? { no_whatsapp: String(body.no_whatsapp) }
          : {}),
        ...(photoPublicUrl != null
          ? { profile_photo: String(photoPublicUrl) }
          : {}),
        ...(emailToSet != null ? { email: emailToSet } : {}),
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        no_whatsapp: true,
        profile_photo: true, // sekarang berisi URL publik
        updated_at: true,
      },
    });

    const resp = json({
      ...updated,
      profile_photo: toPublicUrl(updated.profile_photo),
      image_public_url: toPublicUrl(updated.profile_photo), // alias legacy
    });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (e) {
    // Validasi upload
    if (e?.message === "PAYLOAD_TOO_LARGE") {
      return json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Max file 5MB" } },
        { status: 413 }
      );
    }
    if (e?.message === "UNSUPPORTED_TYPE") {
      return json(
        {
          error: {
            code: "UNSUPPORTED_TYPE",
            message: "Gunakan JPEG/PNG/WebP/AVIF",
          },
        },
        { status: 415 }
      );
    }
    // Prisma unique
    if (e?.code === "P2002") {
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Gagal memperbarui data: email sudah terdaftar.",
            field: "email",
          },
        },
        { status: 400 }
      );
    }
    if (e instanceof Response) return e;
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
