// app/api/consultants/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===== Supabase helpers ===== */
const BUCKET =
  process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "";
const SUPA_URL = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");

function getPublicUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const clean = String(path).replace(/^\/+/, "");
  // Jika ada supabaseAdmin + BUCKET, gunakan API resmi
  if (supabaseAdmin && BUCKET) {
    const { data, error } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(clean);
    if (error) {
      console.error("supabase getPublicUrl error:", error);
      // fallback manual di bawah
    } else if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback manual kalau BUCKET/SDK bermasalah tapi SUPA_URL tersedia
  if (SUPA_URL) {
    const withBucket =
      BUCKET && !clean.startsWith(`${BUCKET}/`) ? `${BUCKET}/${clean}` : clean;
    return `${SUPA_URL}/storage/v1/object/public/${withBucket}`;
  }

  // Terakhir: jangan balikin path mentah (raw) yang bikin 404 di client
  return null;
}

async function uploadConsultantProgramImage(file, consultantId) {
  if (typeof File === "undefined" || !(file instanceof File))
    throw new Error("NO_FILE");
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const size = file.size || 0;
  const type = file.type || "";

  if (size > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `consultants/${String(consultantId)}/programs/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return objectPath;
}

/* ===== Helpers ===== */
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
  if (raw === null || raw === undefined) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function pickTrans(list, primary, fallback) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || list[0] || null;
}

/* ===== GET /api/consultants/:id (DETAIL) =====
Query:
- public=1  -> no auth, hide email/whatsapp
- locale, fallback (default id)
Behavior:
- If :id numeric -> find by ID
- If :id non-numeric + public=1 -> try find by name contains (consultants_translate)
*/
export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url);
  const isPublic = searchParams.get("public") === "1";

  if (!isPublic) {
    try {
      await requireAdmin();
    } catch (err) {
      return handleAuthError(err);
    }
  }

  const rawParam = params?.id;
  const id = parseId(rawParam);
  const locale = pickLocale(req, "locale", "id");
  const fallback = pickLocale(req, "fallback", "id");

  const baseSelect = {
    id: true,
    profile_image_url: true,
    program_consultant_image_url: true,
    created_at: true,
    updated_at: true,
    consultants_translate: {
      select: { locale: true, name: true, description: true },
    },
    program_images: {
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: { id: true, image_url: true, sort: true },
    },
  };
  const selectPublic = { ...baseSelect };
  const selectAdmin = { ...baseSelect, email: true, whatsapp: true };

  let row = null;

  if (id) {
    row = await prisma.consultants.findUnique({
      where: { id },
      select: isPublic ? selectPublic : selectAdmin,
    });
  } else if (isPublic && rawParam) {
    const guessedName = String(rawParam).replace(/-/g, " ").trim();
    if (guessedName.length) {
      row = await prisma.consultants.findFirst({
        where: {
          consultants_translate: {
            some: {
              name: { contains: guessedName, mode: "insensitive" },
            },
          },
        },
        select: selectPublic,
        orderBy: { created_at: "desc" },
      });
    }
  }

  if (!row) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const t = pickTrans(row.consultants_translate, locale, fallback);
  const data = {
    id: row.id,
    email: isPublic ? null : row.email ?? null,
    whatsapp: isPublic ? null : row.whatsapp ?? null,
    profile_image_url: row.profile_image_url,
    profile_image_public_url: getPublicUrl(row.profile_image_url),
    program_consultant_image_url: row.program_consultant_image_url,
    program_consultant_image_public_url: getPublicUrl(
      row.program_consultant_image_url
    ),
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: t?.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
    public: isPublic,
    program_images: (row.program_images || []).map((pi) => ({
      id: pi.id,
      image_url: pi.image_url,
      image_public_url: getPublicUrl(pi.image_url),
      sort: pi.sort ?? 0,
    })),
  };

  const resp = json({ data });
  if (isPublic) {
    resp.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  }
  return resp;
}

/* ===== PUT/PATCH /api/consultants/:id =====
Accepts JSON or multipart/form-data
- parent fields: email?, whatsapp?, profile_image_url?, program_consultant_image_url?
- translations: name_id?, description_id?, name_en?, description_en?, autoTranslate?
- program_images (JSON): string[] or {image_url, sort}[]
- files[] (form): will be uploaded and appended/replaced
- program_images_mode (form only): 'append' | 'replace' (default 'replace')
*/
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const contentType = req.headers.get("content-type") || "";

  let payload = {};
  let uploadFiles = [];
  let imagesMode = "replace"; // default behavior

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const toStr = (k) => (form.has(k) ? String(form.get(k)) : undefined);

    payload.email = form.has("email") ? toStr("email") || null : undefined;
    payload.whatsapp = form.has("whatsapp")
      ? toStr("whatsapp") || null
      : undefined;
    payload.profile_image_url = form.has("profile_image_url")
      ? toStr("profile_image_url") || null
      : undefined;
    payload.program_consultant_image_url = form.has(
      "program_consultant_image_url"
    )
      ? toStr("program_consultant_image_url") || null
      : undefined;

    if (form.has("name_id")) payload.name_id = toStr("name_id");
    if (form.has("description_id"))
      payload.description_id = form.get("description_id") ?? null;
    if (form.has("name_en")) payload.name_en = toStr("name_en");
    if (form.has("description_en"))
      payload.description_en = form.get("description_en") ?? null;
    if (form.has("autoTranslate")) {
      payload.autoTranslate =
        (toStr("autoTranslate") || "true").toLowerCase() !== "false";
    }

    imagesMode =
      (toStr("program_images_mode") || "replace").toLowerCase() === "append"
        ? "append"
        : "replace";

    // optional string images (images[] / program_images[])
    const strImages = [
      ...form.getAll("images"),
      ...form.getAll("images[]"),
      ...form.getAll("program_images"),
      ...form.getAll("program_images[]"),
    ]
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
    if (strImages.length) payload.program_images = strImages;

    // files (files / files[])
    uploadFiles = [...form.getAll("files"), ...form.getAll("files[]")].filter(
      (f) => f && typeof f !== "string"
    );
  } else {
    payload = await req.json().catch(() => ({}));
  }

  // Build parent data
  const parentData = {};
  if (payload.email !== undefined) parentData.email = payload.email;
  if (payload.whatsapp !== undefined) parentData.whatsapp = payload.whatsapp;
  if (payload.profile_image_url !== undefined)
    parentData.profile_image_url = payload.profile_image_url;
  if (payload.program_consultant_image_url !== undefined)
    parentData.program_consultant_image_url =
      payload.program_consultant_image_url;
  if (Object.keys(parentData).length) parentData.updated_at = new Date();

  // Update parent or ensure exists
  if (Object.keys(parentData).length) {
    try {
      await prisma.consultants.update({ where: { id }, data: parentData });
    } catch (e) {
      if (e?.code === "P2002") {
        const field = e?.meta?.target?.join?.(", ") || "unique";
        return json(
          { error: { code: "CONFLICT", message: `${field} already in use` } },
          { status: 409 }
        );
      }
      if (e?.code === "P2025")
        return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
      throw e;
    }
  } else {
    const exists = await prisma.consultants.findUnique({ where: { id } });
    if (!exists) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  // Translations upsert
  const ops = [];

  if (payload.name_id !== undefined || payload.description_id !== undefined) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: { id_consultant_locale: { id_consultant: id, locale: "id" } },
        update: {
          ...(payload.name_id !== undefined
            ? { name: String(payload.name_id ?? "(no title)").slice(0, 150) }
            : {}),
          ...(payload.description_id !== undefined
            ? { description: payload.description_id ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "id",
          name: String(payload.name_id ?? "(no title)").slice(0, 150),
          description: payload.description_id ?? null,
        },
      })
    );
  }

  if (payload.name_en !== undefined || payload.description_en !== undefined) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: { id_consultant_locale: { id_consultant: id, locale: "en" } },
        update: {
          ...(payload.name_en !== undefined
            ? { name: String(payload.name_en ?? "(no title)").slice(0, 150) }
            : {}),
          ...(payload.description_en !== undefined
            ? { description: payload.description_en ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "en",
          name: String(payload.name_en ?? "(no title)").slice(0, 150),
          description: payload.description_en ?? null,
        },
      })
    );
  }

  if (
    payload?.autoTranslate &&
    (payload.name_id !== undefined || payload.description_id !== undefined)
  ) {
    let name_en;
    let description_en;
    try {
      if (payload.name_id !== undefined && payload.name_id)
        name_en = await translate(String(payload.name_id), "id", "en");
    } catch {}
    try {
      if (payload.description_id !== undefined && payload.description_id)
        description_en = await translate(
          String(payload.description_id),
          "id",
          "en"
        );
    } catch {}
    if (name_en !== undefined || description_en !== undefined) {
      ops.push(
        prisma.consultants_translate.upsert({
          where: { id_consultant_locale: { id_consultant: id, locale: "en" } },
          update: {
            ...(name_en ? { name: name_en.slice(0, 150) } : {}),
            ...(description_en !== undefined
              ? { description: description_en ?? null }
              : {}),
            updated_at: new Date(),
          },
          create: {
            id: randomUUID(),
            id_consultant: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 150),
            description: description_en ?? null,
          },
        })
      );
    }
  }

  // Handle program_images (strings + uploads)
  const stringImages = Array.isArray(payload?.program_images)
    ? payload.program_images
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
    : [];

  let uploadedPaths = [];
  if (uploadFiles.length) {
    for (const f of uploadFiles) {
      const p = await uploadConsultantProgramImage(f, id);
      uploadedPaths.push(p);
    }
  }
  const toInsert = [...stringImages, ...uploadedPaths];

  if (
    imagesMode === "replace" &&
    (toInsert.length ||
      payload?.program_images !== undefined ||
      uploadFiles.length)
  ) {
    // wipe then insert
    ops.push(
      prisma.consultant_program_images.deleteMany({
        where: { id_consultant: id },
      })
    );
    if (toInsert.length) {
      ops.push(
        prisma.consultant_program_images.createMany({
          data: toInsert.map((path, idx) => ({
            id_consultant: id,
            image_url: path,
            sort: idx,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        })
      );
    }
  } else if (imagesMode === "append" && toInsert.length) {
    // append after current max sort
    const last = await prisma.consultant_program_images.findFirst({
      where: { id_consultant: id },
      orderBy: [{ sort: "desc" }, { id: "desc" }],
      select: { sort: true },
    });
    let start = last?.sort ? Number(last.sort) + 1 : 0;
    ops.push(
      prisma.consultant_program_images.createMany({
        data: toInsert.map((path, i) => ({
          id_consultant: id,
          image_url: path,
          sort: start + i,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      })
    );
  }

  if (ops.length) await prisma.$transaction(ops);

  return json({ data: { id } });
}

/* ===== DELETE (admin only) ===== */
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
  } catch (e) {
    if (e?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error(`DELETE /api/consultants/${id} error:`, e);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
