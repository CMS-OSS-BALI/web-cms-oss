// app/api/jurusan/route.js
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
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function getOrderBy(param) {
  // tambahkan likes_count ke allowed
  const allowed = new Set([
    "created_at",
    "updated_at",
    "register_price",
    "likes_count",
  ]);
  if (!param) return [{ created_at: "desc" }];

  // dukung alias "popular" => likes_count:desc
  if (String(param).toLowerCase() === "popular") {
    return [{ likes_count: "desc" }, { created_at: "desc" }];
  }

  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
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
      maxAge: 60 * 60 * 24 * 365, // 1 tahun
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

/* ========= GET /api/jurusan (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const partner_id = (searchParams.get("partner_id") || "").trim() || null;

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(partner_id ? { partner_id } : {}),
      ...(q
        ? {
            jurusan_translate: {
              some: {
                locale: { in: [locale, fallback] },
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.jurusan.count({ where }),
      prisma.jurusan.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
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
      }),
    ]);

    // ==== hitung "liked" untuk aktor saat ini ====
    const { key: actorKey } = await getActorKey();
    const ids = rows.map((r) => r.id);
    let likedSet = new Set();
    if (ids.length > 0) {
      const likedRows = await prisma.jurusan_like.findMany({
        where: { actor_key: actorKey, id_jurusan: { in: ids } },
        select: { id_jurusan: true },
      });
      likedSet = new Set(likedRows.map((r) => r.id_jurusan));
    }

    const data = rows.map((r) => {
      const t = pickTrans(r.jurusan_translate, locale, fallback);
      return {
        id: r.id,
        partner_id: r.partner_id,
        image_url: r.image_url,
        image_public_url: getPublicUrl(r.image_url),
        register_price:
          r.register_price == null
            ? null
            : typeof r.register_price === "object" &&
              "toString" in r.register_price
            ? r.register_price.toString()
            : String(r.register_price),
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
        // NEW:
        likes_count: r.likes_count, // BigInt -> string via sanitize()
        liked: likedSet.has(r.id),
      };
    });

    return json({
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        locale,
        fallback,
        sort: searchParams.get("sort") || "created_at:desc",
      },
    });
  } catch (err) {
    console.error("GET /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to fetch jurusan list" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/jurusan (CREATE) ========= */
export async function POST(req) {
  try {
    await assertAdmin();

    const { body, file } = await parseBodyWithFile(req);
    const partner_id = String(body?.partner_id || "").trim();
    if (!partner_id) return badRequest("partner_id wajib diisi");

    const priceRaw = body?.register_price;
    if (
      priceRaw === undefined ||
      priceRaw === null ||
      String(priceRaw).trim() === ""
    ) {
      return badRequest("register_price wajib diisi");
    }
    const register_price = String(priceRaw).trim();

    // image_url Wajib (schema String non-null, 255)
    let image_url;
    if (file) {
      try {
        image_url = normalizeUrl255(await uploadJurusanImage(file));
      } catch (err) {
        const mapped = mapUploadError(err);
        return NextResponse.json(
          { message: mapped.message },
          { status: mapped.status }
        );
      }
    } else {
      image_url = normalizeUrl255(body?.image_url);
      if (!image_url) return badRequest("image_url wajib diisi");
    }

    const name_id = String(body?.name_id ?? "").trim();
    if (!name_id) return badRequest("name_id (Bahasa Indonesia) wajib diisi");
    const description_id =
      typeof body?.description_id === "string" ? body.description_id : null;

    const autoTranslate = !isExplicitFalse(body?.autoTranslate);
    let name_en = String(body?.name_en || "").trim();
    let description_en =
      typeof body?.description_en === "string" ? body.description_en : "";

    const id = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.jurusan.create({
        data: { id, partner_id, register_price, image_url },
      });

      await tx.jurusan_translate.create({
        data: {
          id: randomUUID(),
          id_jurusan: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (autoTranslate) {
        if (!name_en && name_id) {
          try {
            name_en = await translate(name_id, "id", "en");
          } catch (e) {
            console.error(e);
          }
        }
        if (!description_en && description_id) {
          try {
            description_en = await translate(description_id, "id", "en");
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (name_en || description_en) {
        await tx.jurusan_translate.create({
          data: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }
    });

    return json(
      {
        data: {
          id,
          partner_id,
          register_price,
          image_url,
          image_public_url: getPublicUrl(image_url),
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
          likes_count: "0",
          liked: false,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "partner_id tidak valid (FK gagal)" },
        { status: 400 }
      );
    }
    console.error("POST /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to create jurusan" },
      { status: 500 }
    );
  }
}


