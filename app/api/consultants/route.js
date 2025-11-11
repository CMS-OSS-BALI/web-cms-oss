// app/api/consultants/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

// === Storage client (pakai utils kamu, hanya 2 ENV)
import storageClient from "@/app/utils/storageClient";

/* =========================
   Runtime & Defaults
========================= */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_ORDER = [{ created_at: "desc" }];
const MAX_PUBLIC_PER_PAGE = 12;
const MAX_ADMIN_PER_PAGE = 100;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// Simpan di jalur publik dengan prefix ini
const PUBLIC_PREFIX = "cms-oss";

/* =========================
   Public URL helpers
   - Jika DB berisi key/path lama, kita bentuk URL publik:
     {CDN}/public/<cms-oss/>key
   - CDN diestimasi dari OSS_STORAGE_BASE_URL (ganti 'storage.' -> 'cdn.')
========================= */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base; // fallback: pakai base apa adanya
  }
}

function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}

function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* =========================
   Helpers umum
========================= */
const ok = (body, init) => NextResponse.json(sanitize(body), init);
function sanitize(v) {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}
function authError(err) {
  const status = err?.status === 401 ? 401 : 403;
  return ok(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status }
  );
}

function parseIdString(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
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
  const by = (loc) => list?.find?.((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function normalizeOrder(sort) {
  if (!sort) return DEFAULT_ORDER;
  const [field = "", dir = ""] = String(sort).split(":");
  const allowed = new Set(["created_at", "updated_at", "email"]);
  const key = allowed.has(field) ? field : "created_at";
  const order = dir?.toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}

/* =========================
   PII policy
========================= */
async function canIncludePII(req, isPublic) {
  if (isPublic) return false;
  if (req.headers.get("x-ssr") !== "1") return false;
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/* =========================
   Upload helpers (pakai storageClient)
========================= */
async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
}

async function uploadConsultantProgramImage(file, consultantId) {
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/consultants/${consultantId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}
async function uploadConsultantProfileImage(file, consultantId) {
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/consultants/${consultantId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/* =========================
   Serializer
========================= */
function serializeConsultant(row, { locale, fallback, includePII }) {
  const t = pickTrans(row.consultants_translate, locale, fallback);
  return {
    id: row.id,
    email: includePII ? row.email ?? null : null,
    whatsapp: includePII ? row.whatsapp ?? null : null,
    // Always return single public URL
    profile_image_url: toPublicUrl(row.profile_image_url),
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: t?.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
    program_images: (row.program_images || []).map((pi) => ({
      id: pi.id,
      image_url: toPublicUrl(pi.image_url),
      sort: pi.sort ?? 0,
    })),
  };
}

/* =========================
   GET /api/consultants
========================= */
export async function GET(req) {
  const url = new URL(req.url);
  const isPublic = url.searchParams.get("public") === "1";
  const includePII = await canIncludePII(req, isPublic);

  if (!includePII && !isPublic) {
    try {
      await requireAdmin();
    } catch (err) {
      return authError(err);
    }
  }

  const idFilter = parseIdString(url.searchParams.get("id"));
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    includePII ? MAX_ADMIN_PER_PAGE : MAX_PUBLIC_PER_PAGE,
    Math.max(
      1,
      parseInt(url.searchParams.get("perPage") || (includePII ? "10" : "3"), 10)
    )
  );
  const orderBy = normalizeOrder(url.searchParams.get("sort"));
  const locale = pickLocale(req, "locale", "id");
  const fallback = pickLocale(req, "fallback", "id");

  const baseSelect = {
    id: true,
    profile_image_url: true,
    created_at: true,
    updated_at: true,
    consultants_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true, description: true },
    },
    program_images: {
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: { id: true, image_url: true, sort: true },
    },
  };
  const select = includePII
    ? { ...baseSelect, email: true, whatsapp: true }
    : baseSelect;

  // By ID (single)
  if (idFilter) {
    const row = await prisma.consultants.findUnique({
      where: { id: idFilter },
      select,
    });
    const data = row
      ? [serializeConsultant(row, { locale, fallback, includePII })]
      : [];

    const resp = ok({
      data,
      meta: {
        page: 1,
        perPage: 1,
        total: data.length,
        totalPages: 1,
        locale,
        fallback,
        pii: includePII ? 1 : 0,
      },
    });

    decorateCaching(resp, { isPublic, includePII });
    return resp;
  }

  // Listing
  let where = {};
  if (q) {
    where = {
      OR: [
        {
          consultants_translate: {
            some: {
              locale: { in: [locale, fallback] },
              OR: [{ name: { contains: q } }, { description: { contains: q } }],
            },
          },
        },
        ...(includePII
          ? [{ email: { contains: q } }, { whatsapp: { contains: q } }]
          : []),
      ],
    };
  }

  const [total, rows] = await Promise.all([
    prisma.consultants.count({ where }),
    prisma.consultants.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select,
    }),
  ]);

  const data = rows.map((r) =>
    serializeConsultant(r, { locale, fallback, includePII })
  );

  const resp = ok({
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      locale,
      fallback,
      pii: includePII ? 1 : 0,
    },
  });
  decorateCaching(resp, { isPublic, includePII });
  return resp;
}

/* =========================
   POST /api/consultants
========================= */
export async function POST(req) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const ct = req.headers.get("content-type") || "";
  let body = {};
  let uploadFiles = [];
  let profileFile = null;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();

    body = {
      email: form.get("email"),
      whatsapp: form.get("whatsapp"),
      profile_image_url: form.get("profile_image_url"), // optional (bisa URL publik)
      name_id: form.get("name_id") ?? form.get("name"),
      description_id: form.has("description_id")
        ? form.get("description_id")
        : form.get("description"),
      name_en: form.get("name_en"),
      description_en: form.get("description_en"),
      autoTranslate:
        String(form.get("autoTranslate") ?? "true").toLowerCase() !== "false",
    };

    const pf = form.get("profile_file");
    if (pf && typeof pf !== "string") profileFile = pf;

    const strImages = [
      ...form.getAll("images"),
      ...form.getAll("images[]"),
      ...form.getAll("program_images"),
      ...form.getAll("program_images[]"),
    ]
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
    if (strImages.length) body.program_images = strImages;

    uploadFiles = [...form.getAll("files"), ...form.getAll("files[]")].filter(
      (f) => f && typeof f !== "string"
    );
  } else {
    body = await req.json().catch(() => ({}));
  }

  const name_id = String(body?.name_id ?? "").trim();
  if (!name_id || name_id.length < 2) {
    return ok(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "name_id wajib (min 2 chars)",
        },
      },
      { status: 422 }
    );
  }

  const description_id =
    typeof body?.description_id === "string" ? body.description_id : null;

  const email = body?.email ? String(body.email).trim() || null : null;
  const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() || null : null;

  const profile_image_url_in =
    body?.profile_image_url && String(body.profile_image_url).trim()
      ? String(body.profile_image_url).trim()
      : null;

  const autoTranslate = body?.autoTranslate !== false;

  let name_en = String(body?.name_en || "").trim();
  let description_en =
    typeof body?.description_en === "string" ? body.description_en : "";

  const strProgramImages = Array.isArray(body?.program_images)
    ? body.program_images
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
    : [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      // 1) create parent (tanpa avatar dulu)
      const parent = await tx.consultants.create({
        data: {
          email,
          whatsapp,
          // Jika user kirim string: bisa URL publik atau key/path -> simpan apa adanya dulu
          profile_image_url: profile_image_url_in || null,
        },
        select: {
          id: true,
          profile_image_url: true,
          created_at: true,
          updated_at: true,
        },
      });

      // 2) translations
      await tx.consultants_translate.create({
        data: {
          id: randomUUID(),
          id_consultant: parent.id,
          locale: "id",
          name: name_id.slice(0, 150),
          description: description_id || null,
        },
      });

      if (autoTranslate) {
        try {
          if (!name_en && name_id)
            name_en = await translate(name_id, "id", "en");
        } catch {}
        try {
          if (!description_en && description_id)
            description_en = await translate(description_id, "id", "en");
        } catch {}
      }

      if (name_en || description_en) {
        await tx.consultants_translate.create({
          data: {
            id: randomUUID(),
            id_consultant: parent.id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 150),
            description: description_en || null,
          },
        });
      }

      // 3) upload avatar jika ada file dan belum ada URL string
      if (profileFile && !profile_image_url_in) {
        const publicUrl = await uploadConsultantProfileImage(
          profileFile,
          parent.id
        );
        await tx.consultants.update({
          where: { id: parent.id },
          data: { profile_image_url: publicUrl, updated_at: new Date() },
        });
        parent.profile_image_url = publicUrl;
      }

      // 4) Upload program images (opsional) -> simpan sebagai URL publik
      const uploadedUrls = [];
      if (Array.isArray(uploadFiles) && uploadFiles.length) {
        for (const f of uploadFiles) {
          const url = await uploadConsultantProgramImage(f, parent.id);
          if (url) uploadedUrls.push(url);
        }
      }
      // String images dari body: bisa URL atau key/path -> normalisasi ke URL publik
      const normalizedFromBody = strProgramImages
        .map(toPublicUrl)
        .filter(Boolean);
      const allImages = [...normalizedFromBody, ...uploadedUrls];

      if (allImages.length) {
        await tx.consultant_program_images.createMany({
          data: allImages.map((url, idx) => ({
            id_consultant: parent.id,
            image_url: url, // simpan URL publik langsung
            sort: idx,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        });
      }

      return parent;
    });

    const resp = ok(
      {
        data: {
          id: created.id,
          profile_image_url: toPublicUrl(created.profile_image_url),
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
      },
      { status: 201 }
    );
    resp.headers.set("Cache-Control", "no-store");
    resp.headers.set("Vary", "Cookie, x-ssr, Accept-Language");
    return resp;
  } catch (err) {
    if (err?.message === "PAYLOAD_TOO_LARGE")
      return ok({ message: "Maksimal 10MB" }, { status: 413 });
    if (err?.message === "UNSUPPORTED_TYPE")
      return ok({ message: "Format harus JPEG/PNG/WebP" }, { status: 415 });
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.join?.(", ") || "unique";
      return ok(
        { error: { code: "CONFLICT", message: `${field} already in use` } },
        { status: 409 }
      );
    }
    console.error("POST /api/consultants error:", err);
    return ok({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

function decorateCaching(resp, { isPublic, includePII }) {
  if (isPublic) {
    resp.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
    resp.headers.set("Vary", "Accept-Language");
  } else {
    resp.headers.set("Cache-Control", "no-store");
    resp.headers.set("Vary", "Cookie, x-ssr, Accept-Language");
  }
}
