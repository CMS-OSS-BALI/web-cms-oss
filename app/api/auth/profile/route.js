// app/api/auth/profile/route.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import sharp from "sharp";

/* -------------------- config -------------------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET =
  process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "";
const SUPA_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).replace(/\/+$/, "");
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/* -------------------- helpers -------------------- */
const json = (d, init) => NextResponse.json(d, init);

function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  const clean = String(path).replace(/^\/+/, "");
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
}

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
      profile_photo: true, // PATH disimpan di DB
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

    // nama field file yg didukung
    const candidates = ["avatar", "image", "file", "profile_photo"];
    for (const k of candidates) {
      const f = form.get(k);
      // di runtime node Next.js, File tersedia di Web Streams API
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

/**
 * Upload avatar dengan crop 1:1 center di server menggunakan sharp.
 * @param {File} file - file dari multipart/form-data
 * @param {object} opt
 * @param {string|number} opt.userId - id user untuk folder di storage
 * @param {number} [opt.size=600] - dimensi square output (WxH)
 * @param {number} [opt.quality=90] - kualitas WebP 1..100
 * @returns {Promise<string>} path object di bucket (bukan public URL)
 */
async function uploadAvatar1x1(
  file,
  { userId, size = 600, quality = 90 } = {}
) {
  if (!file) return null;
  if (!supabaseAdmin || !BUCKET)
    throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const inputSize = file.size || 0;
  const inputType = (file.type || "").toLowerCase();

  if (inputSize > MAX_FILE_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
  if (inputType && !ALLOWED_TYPES.has(inputType))
    throw new Error("UNSUPPORTED_TYPE");

  // Baca buffer dari File
  const arrayBuf = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuf);

  // Proses crop square 1:1 (center) + rotate EXIF + convert WebP
  const outBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(Number(size) || 600, Number(size) || 600, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: Number(quality) || 90 })
    .toBuffer();

  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2);
  const objectPath = `avatars/${userId || "unknown"}/avatar_${ts}_${rnd}.webp`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, outBuffer, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw new Error(error.message);
  return objectPath; // simpan PATH di DB
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
      profile_photo: toPublicUrl(me.profile_photo), // public URL
      image_public_url: toPublicUrl(me.profile_photo), // alias
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

    // Opsi ukuran square dari body (baik multipart form fields atau JSON)
    const sizeParam = Number(body?.size);
    const AVATAR_SIZE =
      Number.isFinite(sizeParam) && sizeParam >= 64 ? sizeParam : 600;

    let photoPath = null;
    if (file) {
      // 🚀 PROSES CROP 1:1 + UPLOAD
      photoPath = await uploadAvatar1x1(file, {
        userId: me.id,
        size: AVATAR_SIZE,
        quality: 90,
      });
    } else if (body?.profile_photo) {
      // jika dikirim full public URL, konversi ke PATH
      const s = String(body.profile_photo).trim();
      const prefix = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/`;
      photoPath = s.startsWith(prefix) ? s.slice(prefix.length) : s;
    }

    // minimal validation
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

    const updated = await prisma.admin_users.update({
      where: { id: me.id },
      data: {
        ...(body?.name != null ? { name: String(body.name) } : {}),
        ...(body?.no_whatsapp != null
          ? { no_whatsapp: String(body.no_whatsapp) }
          : {}),
        ...(photoPath != null ? { profile_photo: String(photoPath) } : {}),
        ...(emailToSet != null ? { email: emailToSet } : {}),
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        no_whatsapp: true,
        profile_photo: true,
        updated_at: true,
      },
    });

    const resp = json({
      ...updated,
      profile_photo: toPublicUrl(updated.profile_photo),
      image_public_url: toPublicUrl(updated.profile_photo),
    });
    resp.headers.set("Cache-Control", "no-store");
    return resp;
  } catch (e) {
    // Prisma unique
    if (e?.code === "P2002") {
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
    }
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
    if (e instanceof Response) return e;
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
