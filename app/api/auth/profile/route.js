import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

async function uploadAvatar(file) {
  if (!file) return null;
  if (!supabaseAdmin || !BUCKET)
    throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const size = file.size || 0;
  const type = (file.type || "").toLowerCase();
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (size > 5 * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext =
    (file.name && file.name.includes(".")
      ? file.name.split(".").pop()
      : "jpg") || "jpg";
  const objectPath = `avatars/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      cacheControl: "3600",
      contentType: type || "application/octet-stream",
      upsert: false,
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

    let photoPath = null;
    if (file) {
      photoPath = await uploadAvatar(file); // path di bucket
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
    if (e instanceof Response) return e;
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
