// app/api/consultants/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import storageClient from "@/app/utils/storageClient";
import { cropFileTo9x16Webp, cropFileTo16x9Webp } from "@/app/utils/cropper";

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

const PUBLIC_PREFIX = "cms-oss";

/* =========================
   Public URL helpers
========================= */
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
   Upload helpers
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

/**
 * Semua gambar program dikrop 16:9 (WebP) sebelum upload
 * (foto program lebih lebar, tidak lagi rasio 9:16)
 */
async function uploadConsultantProgramImage(file, consultantId) {
  await assertImageFileOrThrow(file);

  // crop 16:9 → WebP (server: pakai sharp)
  const { file: croppedFile } = await cropFileTo16x9Webp(file, {
    width: 1280,
    quality: 90,
  });

  const res = await storageClient.uploadBufferWithPresign(croppedFile, {
    folder: `${PUBLIC_PREFIX}/consultants/${consultantId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/**
 * Foto profil konsultan tetap dikrop 9:16
 */
async function uploadConsultantProfileImage(file, consultantId) {
  await assertImageFileOrThrow(file);

  const { file: croppedFile } = await cropFileTo9x16Webp(file, {
    height: 1920,
    quality: 90,
  });

  const res = await storageClient.uploadBufferWithPresign(croppedFile, {
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
   POST /api/consultants  (NO long I/O inside transaction)
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
      profile_image_url: form.get("profile_image_url"),
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

  // === 1) Translate DI LUAR TRANSAKSI ===
  if (autoTranslate) {
    try {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
    } catch {}
    try {
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    } catch {}
  }

  // === 2) Buat parent dulu (cepat, 1 query) ===
  const id = randomUUID();
  let createdParent;
  try {
    createdParent = await prisma.consultants.create({
      data: {
        id,
        email,
        whatsapp,
        profile_image_url: profile_image_url_in || null,
      },
      select: {
        id: true,
        profile_image_url: true,
        created_at: true,
        updated_at: true,
      },
    });
  } catch (e) {
    if (e?.code === "P2002") {
      const field = e?.meta?.target?.join?.(", ") || "unique";
      return ok(
        { error: { code: "CONFLICT", message: `${field} already in use` } },
        { status: 409 }
      );
    }
    return ok({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }

  // === 3) Upload file DI LUAR TRANSAKSI ===
  let avatarPublicUrl = createdParent.profile_image_url || null;
  try {
    if (profileFile && !profile_image_url_in) {
      avatarPublicUrl = await uploadConsultantProfileImage(profileFile, id);
    }
  } catch (e) {
    if (e?.message === "PAYLOAD_TOO_LARGE")
      return ok({ message: "Maksimal 10MB" }, { status: 413 });
    if (e?.message === "UNSUPPORTED_TYPE")
      return ok({ message: "Format harus JPEG/PNG/WebP" }, { status: 415 });
    // kalau upload avatar gagal, kita tetap lanjut tanpa avatar
  }

  let uploadedProgramUrls = [];
  try {
    if (Array.isArray(uploadFiles) && uploadFiles.length) {
      for (const f of uploadFiles) {
        const u = await uploadConsultantProgramImage(f, id);
        if (u) uploadedProgramUrls.push(u);
      }
    }
  } catch (e) {
    // kalau satu foto gagal, kita lanjut dengan yang berhasil
  }

  const strProgramImages = Array.isArray(body?.program_images)
    ? body.program_images
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
    : [];
  const normalizedFromBody = strProgramImages.map(toPublicUrl).filter(Boolean);
  const allImages = [...normalizedFromBody, ...uploadedProgramUrls];

  // === 4) Kumpulan query DB SAJA dalam $transaction([...]) ===
  const queries = [];

  // translations
  queries.push(
    prisma.consultants_translate.create({
      data: {
        id: randomUUID(),
        id_consultant: id,
        locale: "id",
        name: name_id.slice(0, 150),
        description: description_id || null,
      },
    })
  );
  if (name_en || description_en) {
    queries.push(
      prisma.consultants_translate.create({
        data: {
          id: randomUUID(),
          id_consultant: id,
          locale: "en",
          name: (name_en || "(no title)").slice(0, 150),
          description: description_en || null,
        },
      })
    );
  }

  // set avatar (jika berubah karena upload)
  if (avatarPublicUrl && avatarPublicUrl !== createdParent.profile_image_url) {
    queries.push(
      prisma.consultants.update({
        where: { id },
        data: { profile_image_url: avatarPublicUrl, updated_at: new Date() },
      })
    );
  }

  // program images
  if (allImages.length) {
    queries.push(
      prisma.consultant_program_images.createMany({
        data: allImages.map((url, idx) => ({
          id_consultant: id,
          image_url: url,
          sort: idx,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      })
    );
  }

  try {
    if (queries.length) {
      await prisma.$transaction(queries);
    }
  } catch (err) {
    // Best-effort rollback parent jika batch gagal (tanpa menghapus file)
    try {
      await prisma.consultants.delete({ where: { id } });
    } catch {}
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.join?.(", ") || "unique";
      return ok(
        { error: { code: "CONFLICT", message: `${field} already in use` } },
        { status: 409 }
      );
    }
    return ok({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }

  const resp = ok(
    {
      data: {
        id,
        profile_image_url: toPublicUrl(avatarPublicUrl),
        created_at: createdParent.created_at,
        updated_at: new Date().toISOString(),
      },
    },
    { status: 201 }
  );
  resp.headers.set("Cache-Control", "no-store");
  resp.headers.set("Vary", "Cookie, x-ssr, Accept-Language");
  return resp;
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
