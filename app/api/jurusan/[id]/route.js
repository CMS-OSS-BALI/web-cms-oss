// app/api/jurusan/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = process.env.SUPABASE_BUCKET;
const STORAGE_PUBLIC_BASE = (() => {
  const explicit = (process.env.NEXT_PUBLIC_STORAGE_BASE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const bucket = (process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "").trim().replace(/^\/+|\/+$/g, "");
  if (supabaseUrl && bucket) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}`;
  }
  return "";
})();

/* ========= Helpers ========= */
function isHttpUrl(path) {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}
function normalizeImageInput(value) {
  const raw = typeof value === "string" ? value : value ? String(value) : "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isHttpUrl(trimmed)) {
    if (STORAGE_PUBLIC_BASE && trimmed.startsWith(`${STORAGE_PUBLIC_BASE}/`)) {
      return trimmed.slice(STORAGE_PUBLIC_BASE.length + 1).replace(/^\/+/, "").slice(0, 255);
    }
    return trimmed.slice(0, 255);
  }
  return trimmed.replace(/^\/+/, "").slice(0, 255);
}
function ensureLeadingSlash(path) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}
function getPublicUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  const cleaned = path.replace(/^\/+/, "");
  if (!cleaned) return null;
  if (BUCKET && supabaseAdmin?.storage) {
    try {
      const { data, error } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(cleaned);
      if (!error && data?.publicUrl) {
        return data.publicUrl;
      }
      if (error) {
        console.error("supabase getPublicUrl error (jurusan):", error);
      }
    } catch (err) {
      console.error("supabase getPublicUrl exception (jurusan):", err);
    }
  }
  if (STORAGE_PUBLIC_BASE) {
    return `${STORAGE_PUBLIC_BASE}/${cleaned}`;
  }
  return ensureLeadingSlash(cleaned);
}
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
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}
function normalizeUrl255(v) {
  return normalizeImageInput(v);
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const isFileObject = (value) =>
  typeof File !== "undefined" && value instanceof File;

function isExplicitFalse(value) {
  if (value === false || value === 0) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["false", "0", "no", "off"].includes(normalized);
  }
  return false;
}

async function uploadJurusanImage(file) {
  if (!isFileObject(file)) throw new Error("NO_FILE");
  if (!BUCKET || !supabaseAdmin?.storage)
    throw new Error("SUPABASE_NOT_CONFIGURED");

  const size = Number(file.size) || 0;
  if (size > MAX_IMAGE_SIZE) throw new Error("PAYLOAD_TOO_LARGE");

  const type = file.type || "";
  if (type && !ALLOWED_IMAGE_TYPES.has(type))
    throw new Error("UNSUPPORTED_TYPE");

  const rawExt = (file.name?.split(".").pop() || "").toLowerCase();
  const safeExt = rawExt.replace(/[^a-z0-9]/g, "");
  const ext = safeExt ? `.${safeExt}` : "";
  const unique = `${Date.now()}-${randomUUID().replace(/-/g, "")}`;
  const datePrefix = new Date().toISOString().slice(0, 10);
  const objectPath = `jurusan/${datePrefix}/${unique}${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message || "UPLOAD_FAILED");
  return objectPath;
}

async function parseBodyWithFile(req) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const body = {};
    for (const [key, value] of form.entries()) {
      if (key === "file") continue;
      if (body[key] === undefined) body[key] = value;
    }
    const file = form.get("file");
    return { body, file: isFileObject(file) ? file : null };
  }
  const body = await req.json().catch(() => ({}));
  return { body: body ?? {}, file: null };
}

function mapUploadError(err) {
  const message = err?.message || "";
  if (message === "PAYLOAD_TOO_LARGE")
    return { status: 413, message: "Maksimal 10MB" };
  if (message === "UNSUPPORTED_TYPE")
    return { status: 415, message: "Format harus JPEG/PNG/WebP" };
  if (message === "SUPABASE_NOT_CONFIGURED")
    return {
      status: 500,
      message: "Supabase bucket belum dikonfigurasi",
    };
  return { status: 500, message: "Upload gambar gagal" };
}

/* ====== Like actor helpers (login / anonymous via cookie) ====== */
function getOrSetClientId() {
  const jar = cookies();
  let cid = jar.get("cid")?.value;
  if (!cid) {
    cid = randomUUID();
    jar.set({
      name: "cid",
      value: cid,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return cid;
}
async function getActorKey() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (userId) return { key: `user:${userId}`, type: "USER" };
  const cid = getOrSetClientId();
  return { key: `client:${cid}`, type: "CLIENT" };
}

/* ========= GET /api/jurusan/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");

    const item = await prisma.jurusan.findFirst({
      where: { id, deleted_at: null },
      include: {
        jurusan_translate: {
          where: { locale: { in: [locale, fallback] } },
          select: {
            id: true,
            id_jurusan: true,
            locale: true,
            name: true,
            description: true,
          },
        },
      },
    });
    if (!item) return notFound();

    // cek status liked untuk aktor ini
    const { key: actorKey } = await getActorKey();
    const likedRow = await prisma.jurusan_like.findFirst({
      where: { id_jurusan: id, actor_key: actorKey },
      select: { id: true },
    });

    const t = pickTrans(item.jurusan_translate, locale, fallback);

    return json({
      data: {
        id: item.id,
        partner_id: item.partner_id,
        image_url: item.image_url,
        image_public_url: getPublicUrl(item.image_url),
        register_price:
          item.register_price == null
            ? null
            : typeof item.register_price === "object" &&
              "toString" in item.register_price
            ? item.register_price.toString()
            : String(item.register_price),
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
        // NEW:
        likes_count: item.likes_count, // BigInt -> string via sanitize()
        liked: Boolean(likedRow),
      },
    });
  } catch (err) {
    console.error(`GET /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch jurusan detail" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/jurusan/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");
    const { body, file } = await parseBodyWithFile(req);

    const parentOps = {};
    if (body.partner_id !== undefined) {
      const partner_id = String(body.partner_id || "").trim();
      if (!partner_id) return badRequest("partner_id tidak boleh kosong");
      parentOps.partner_id = partner_id;
    }
    if (body.register_price !== undefined) {
      const priceStr = String(body.register_price).trim();
      if (priceStr === "")
        return badRequest("register_price tidak boleh kosong");
      parentOps.register_price = priceStr;
    }
    if (file) {
      try {
        parentOps.image_url = normalizeUrl255(
          await uploadJurusanImage(file)
        );
      } catch (err) {
        const mapped = mapUploadError(err);
        return NextResponse.json(
          { message: mapped.message },
          { status: mapped.status }
        );
      }
    }
    if (!file && body.image_url !== undefined) {
      const url = normalizeUrl255(body.image_url);
      if (!url) return badRequest("image_url tidak boleh kosong");
      parentOps.image_url = url;
    }

    if (Object.keys(parentOps).length) {
      parentOps.updated_at = new Date();
      await prisma.jurusan.update({ where: { id }, data: parentOps });
    } else {
      const exists = await prisma.jurusan.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    const ops = [];

    if (body.name_id !== undefined || body.description_id !== undefined) {
      ops.push(
        prisma.jurusan_translate.upsert({
          where: { id_jurusan_locale: { id_jurusan: id, locale: "id" } },
          update: {
            ...(body.name_id !== undefined
              ? { name: String(body.name_id).slice(0, 191) }
              : {}),
            ...(body.description_id !== undefined
              ? { description: body.description_id ?? null }
              : {}),
          },
          create: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "id",
            name: String(body.name_id ?? "(no title)").slice(0, 191),
            description: body.description_id ?? null,
          },
        })
      );
    }

    const autoTranslate = !isExplicitFalse(body?.autoTranslate);
    const hasNameEn = Object.prototype.hasOwnProperty.call(body, "name_en");
    const hasDescriptionEn = Object.prototype.hasOwnProperty.call(
      body,
      "description_en"
    );

    let name_en = hasNameEn ? String(body.name_en || "").trim() : "";
    let description_en = hasDescriptionEn
      ? typeof body.description_en === "string"
        ? body.description_en
        : ""
      : "";

    if (autoTranslate && (body.name_id || body.description_id)) {
      if (!name_en && body.name_id) {
        try {
          name_en = await translate(String(body.name_id), "id", "en");
        } catch (e) {
          console.error(e);
        }
      }
      if (!description_en && body.description_id) {
        try {
          description_en = await translate(
            String(body.description_id),
            "id",
            "en"
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (hasNameEn || hasDescriptionEn || name_en || description_en) {
      ops.push(
        prisma.jurusan_translate.upsert({
          where: { id_jurusan_locale: { id_jurusan: id, locale: "en" } },
          update: {
            ...(hasNameEn || name_en
              ? { name: (name_en || "(no title)").slice(0, 191) }
              : {}),
            ...(hasDescriptionEn || description_en
              ? { description: description_en || null }
              : {}),
          },
          create: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({ data: { id } });
  } catch (err) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "partner_id tidak valid (FK gagal)" },
        { status: 400 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update jurusan" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/jurusan/:id ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const deleted = await prisma.jurusan.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({ data: deleted });
  } catch (err) {
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete jurusan" },
      { status: 500 }
    );
  }
}
