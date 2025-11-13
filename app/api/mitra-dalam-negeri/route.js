// app/api/mitra-dalam-negeri/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import storageClient from "@/app/utils/storageClient";
import { randomUUID } from "crypto";
import { cropFileTo1x1Webp } from "@/app/utils/cropper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const FALLBACK_LOCALE = EN_LOCALE;
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const NIK_LENGTH = 16;
const DIGIT_ONLY = /\D+/g;

/* =========================
   Storage & URL helpers
========================= */
const PUBLIC_PREFIX = "cms-oss";

// Ganti base "storage." ke "cdn." agar URL publik langsung CDN
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

// url -> storage key (untuk hapus)
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) {
    return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  }
  return null;
}

function sanitizeNik(value) {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(DIGIT_ONLY, "");
  return digits || null;
}

// Best-effort remover ke service storage
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
   Upload validators
========================= */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type))
    throw Object.assign(new Error("UNSUPPORTED_TYPE"), {
      meta: { accepted: [...ALLOWED_IMAGE_TYPES] },
    });
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_IMAGE_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
}

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "text/plain",
]);
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

async function assertAttachmentFileOrThrow(file) {
  const type = file?.type || "";
  if (type && !ALLOWED_FILE_TYPES.has(type))
    throw Object.assign(new Error("UNSUPPORTED_TYPE"), {
      meta: { accepted: [...ALLOWED_FILE_TYPES] },
    });
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_FILE_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
}

async function uploadPublicFile(file, folder) {
  // folder tanpa prefix "cms-oss", helper akan menambahkan
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/${folder}`.replace(/\/+/g, "/"),
    isPublic: true,
  });
  return res?.publicUrl || null;
}

/* =============== NEW: upload square 1:1 =============== */
async function uploadLogoSquare1x1(file, folder) {
  await assertImageFileOrThrow(file);

  // SVG tidak dicrop (biarkan asli)
  if (String(file.type).toLowerCase() === "image/svg+xml") {
    return uploadPublicFile(file, folder);
  }

  // Crop ke 1:1 → WebP (server pakai sharp)
  const processed = await cropFileTo1x1Webp(file, { size: 1080, quality: 92 });
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

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const outFile = new File([buffer], filename, {
    type: contentType || "image/webp",
  });

  return uploadPublicFile(outFile, folder);
}

/* =========================
   Helpers umum
========================= */
const isPg = (process.env.DATABASE_URL || "").startsWith("postgres");
const ci = (q) =>
  q
    ? isPg
      ? { contains: q, mode: "insensitive" }
      : { contains: q }
    : undefined;

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
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function normalizeLocale(v, f = DEFAULT_LOCALE) {
  return (v || f).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function parseStatusFilter(s) {
  if (!s) return undefined;
  const ALLOWED = new Set(["PENDING", "APPROVED", "DECLINED"]);
  const arr = String(s)
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x) => ALLOWED.has(x));
  return arr.length ? arr : undefined;
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "status"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
async function assertAdmin(req) {
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && ADMIN_TEST_KEY && headerKey === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true, email: true },
    });
    if (!anyAdmin)
      throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    return { id: anyAdmin.id, email: anyAdmin.email, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email)
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  return session.user;
}

// form-data / urlencoded / json + ambil file (mendukung multi-attachments)
async function readBodyAndFiles(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  const isAttachKey = (k = "") => {
    const key = String(k).toLowerCase();
    return (
      key === "attachments" ||
      key === "files" ||
      key === "dokumen" ||
      key === "attachment" ||
      key.endsWith("[]") ||
      key.includes("attachment")
    );
  };

  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    let imageFile = null;
    const attachments = [];

    for (const [k, v] of form.entries()) {
      const isFile = typeof File !== "undefined" && v instanceof File;
      if (!isFile) {
        body[k] = v;
        continue;
      }
      if (!imageFile && (k === "image" || k === "logo" || k === "image_file")) {
        imageFile = v;
        continue;
      }
      if (isAttachKey(k)) {
        attachments.push(v);
        continue;
      }
      attachments.push(v);
    }
    return { body, imageFile, attachments };
  }

  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, imageFile: null, attachments: [] };
}

function parseDateOnly(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
}

async function resolveCategoryId({ category_id, category_slug }) {
  const id = category_id ? String(category_id).trim() : "";
  const slug = category_slug ? String(category_slug).trim() : "";
  if (!id && !slug) return null;
  const found = await prisma.mitra_categories.findFirst({
    where: id ? { id } : { slug },
    select: { id: true },
  });
  if (!found) throw Object.assign(new Error("BAD_CATEGORY"), { status: 400 });
  return found.id;
}

/* ---------- GET (admin) ---------- */
export async function GET(req) {
  try {
    await assertAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 10))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const statusFilter = parseStatusFilter(searchParams.get("status"));
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || FALLBACK_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const category_id = searchParams.get("category_id");
    const category_slug = searchParams.get("category_slug");

    // date range
    const dateFrom = parseDateOnly(searchParams.get("date_from")); // inclusive
    const dateToRaw = parseDateOnly(searchParams.get("date_to")); // inclusive -> +1d for lt
    const dateTo = dateToRaw
      ? new Date(dateToRaw.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : includeDeleted || withDeleted
        ? {}
        : { deleted_at: null }),
      mitra_translate: { some: { locale: { in: locales } } },
    };

    const AND = [];

    if (statusFilter) AND.push({ status: { in: statusFilter } });

    // category filter (id atau slug)
    if (category_id) {
      AND.push({ category_id: String(category_id) });
    } else if (category_slug) {
      const cat = await prisma.mitra_categories.findUnique({
        where: { slug: String(category_slug) },
        select: { id: true },
      });
      AND.push({ category_id: cat?.id ?? "__nope__" });
    }

    // free-text search
    if (q) {
      AND.push({
        OR: [
          {
            mitra_translate: {
              some: {
                locale: { in: locales },
                OR: [{ name: ci(q) }, { description: ci(q) }],
              },
            },
          },
          { email: ci(q) },
          { phone: ci(q) },
          { address: ci(q) },
          { city: ci(q) },
          { province: ci(q) },
          { postal_code: ci(q) },
          { instagram: ci(q) },
          { twitter: ci(q) },
          { website: ci(q) },
          { contact_name: ci(q) },
          { contact_position: ci(q) },
          { contact_whatsapp: ci(q) },
          { nik: ci(q) },
        ],
      });
    }

    // created_at range
    if (dateFrom || dateTo) {
      AND.push({
        created_at: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lt: dateTo } : {}),
        },
      });
    }

    if (AND.length) where.AND = AND;

    const [total, rows] = await Promise.all([
      prisma.mitra.count({ where }),
      prisma.mitra.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          mitra_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
          mitra_categories: {
            include: {
              mitra_categories_translate: {
                where: { locale: { in: locales } },
                select: { locale: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const t = pickTrans(row.mitra_translate || [], locale, fallback);
      const ct = pickTrans(
        row.mitra_categories?.mitra_categories_translate || [],
        locale,
        fallback
      );
      return {
        id: row.id,
        admin_user_id: row.admin_user_id,
        category: row.mitra_categories
          ? {
              id: row.mitra_categories.id,
              slug: row.mitra_categories.slug,
              name: ct?.name ?? null,
              locale_used: ct?.locale ?? null,
            }
          : null,
        email: row.email,
        phone: row.phone,
        nik: row.nik,
        website: row.website,
        instagram: row.instagram,
        twitter: row.twitter,
        mou_url: toPublicUrl(row.mou_url),
        image_url: toPublicUrl(row.image_url),
        address: row.address,
        city: row.city,
        province: row.province,
        postal_code: row.postal_code,
        contact_name: row.contact_name,
        contact_position: row.contact_position,
        contact_whatsapp: row.contact_whatsapp,
        status: row.status,
        review_notes: row.review_notes,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        created_ts: row.created_at ? new Date(row.created_at).getTime() : null,
        updated_ts: row.updated_at ? new Date(row.updated_at).getTime() : null,
        locale_used: t?.locale || null,
        merchant_name: t?.name || null,
        about: t?.description || null,
      };
    });

    return json({
      message: "OK",
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        locale,
        fallback,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    console.error("GET /api/mitra-dalam-negeri error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}

/* ---------- POST (PUBLIC, + upload ke storage baru, + CROP 1:1) ---------- */
export async function POST(req) {
  try {
    const { body, imageFile, attachments } = await readBodyAndFiles(req);

    const locale = normalizeLocale(body.locale);
    const merchantName = (body?.merchant_name || "").trim();
    const email = (body?.email || "").trim();
    const phone = (body?.phone || "").trim();
    const address = (body?.address || "").trim();
    const nikInput = body?.nik ?? body?.ktp_number;
    const nik = sanitizeNik(nikInput);

    if (!merchantName)
      return json(
        {
          error: { code: "BAD_REQUEST", message: "merchant_name wajib diisi" },
        },
        { status: 400 }
      );
    if (!email)
      return json(
        { error: { code: "BAD_REQUEST", message: "email wajib diisi" } },
        { status: 400 }
      );
    if (!phone)
      return json(
        { error: { code: "BAD_REQUEST", message: "phone wajib diisi" } },
        { status: 400 }
      );
    if (!nik)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "NIK wajib diisi",
            field: "nik",
          },
        },
        { status: 400 }
      );
    if (nik.length !== NIK_LENGTH)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: `NIK harus ${NIK_LENGTH} digit angka.`,
            field: "nik",
          },
        },
        { status: 400 }
      );
    if (!address)
      return json(
        { error: { code: "BAD_REQUEST", message: "address wajib diisi" } },
        { status: 400 }
      );

    // kategori (opsional)
    let categoryId = null;
    try {
      categoryId = await resolveCategoryId({
        category_id: body.category_id,
        category_slug: body.category_slug,
      });
    } catch (e) {
      if (e?.message === "BAD_CATEGORY")
        return json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "Kategori tidak ditemukan.",
            },
          },
          { status: 400 }
        );
      throw e;
    }

    // wajib ada logo/image (URL atau file)
    let image_url = body.image_url ? String(body.image_url).trim() : null;
    if (!image_url && !imageFile) {
      return json(
        {
          error: { code: "BAD_REQUEST", message: "logo/image wajib diunggah" },
        },
        { status: 400 }
      );
    }

    // siapkan terjemahan di luar transaksi
    const aboutRaw =
      body.about !== undefined && body.about !== null
        ? String(body.about)
        : null;

    let nameEn = null;
    let aboutEn = null;
    if (locale !== EN_LOCALE) {
      const [nEn, aEn] = await Promise.all([
        merchantName
          ? translate(merchantName, locale, EN_LOCALE).catch(() => merchantName)
          : Promise.resolve(merchantName),
        aboutRaw
          ? translate(aboutRaw, locale, EN_LOCALE).catch(() => aboutRaw)
          : Promise.resolve(aboutRaw),
      ]);
      nameEn = nEn || merchantName;
      aboutEn = aEn ?? aboutRaw;
    }

    // 1) Buat parent dahulu
    const created = await prisma.mitra.create({
      data: {
        id: randomUUID(),
        // org info
        email,
        phone,
        website: body.website ? String(body.website).trim() : null,
        instagram: body.instagram ? String(body.instagram).trim() : null,
        twitter: body.twitter ? String(body.twitter).trim() : null,
        mou_url: body.mou_url ? String(body.mou_url).trim() : null,
        image_url: image_url || null,

        // address
        address,
        city: body.city ? String(body.city).trim() : null,
        province: body.province ? String(body.province).trim() : null,
        postal_code: body.postal_code ? String(body.postal_code).trim() : null,

        // contact person
        contact_name: body.contact_name
          ? String(body.contact_name).trim()
          : null,
        contact_position: body.contact_position
          ? String(body.contact_position).trim()
          : null,
        contact_whatsapp: body.contact_whatsapp
          ? String(body.contact_whatsapp).trim()
          : null,

        // category
        category_id: categoryId,

        // workflow
        status: "PENDING",
        review_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        nik,

        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 2) Upload logo (opsional) DI LUAR transaksi, crop 1:1
    if (imageFile && !image_url) {
      try {
        const publicUrl = await uploadLogoSquare1x1(
          imageFile,
          `mitra/${created.id}`
        );
        if (publicUrl) {
          await prisma.mitra.update({
            where: { id: created.id },
            data: { image_url: publicUrl, updated_at: new Date() },
          });
        }
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json(
            {
              error: { code: "PAYLOAD_TOO_LARGE", message: "Gambar max 10MB" },
            },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            {
              error: {
                code: "UNSUPPORTED_TYPE",
                message: "Gambar harus JPEG/PNG/WebP/SVG",
              },
            },
            { status: 415 }
          );
        console.error("upload image error:", e);
        return json(
          { error: { code: "SERVER_ERROR", message: "Upload gambar gagal" } },
          { status: 500 }
        );
      }
    }

    // 3) Translations
    await prisma.$transaction(async (tx) => {
      await tx.mitra_translate.create({
        data: {
          id: randomUUID(),
          id_merchants: created.id,
          locale,
          name: merchantName,
          description: aboutRaw,
        },
      });

      if (locale !== EN_LOCALE) {
        await tx.mitra_translate.upsert({
          where: {
            id_merchants_locale: {
              id_merchants: created.id,
              locale: EN_LOCALE,
            },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(aboutEn !== undefined ? { description: aboutEn ?? null } : {}),
          },
          create: {
            id: randomUUID(),
            id_merchants: created.id,
            locale: EN_LOCALE,
            name: nameEn || merchantName,
            description: aboutEn ?? aboutRaw,
          },
        });
      }
    });

    // 4) Upload attachments (opsional)
    let uploaded = [];
    if (attachments?.length) {
      for (const f of attachments) {
        try {
          await assertAttachmentFileOrThrow(f);
          const publicUrl = await uploadPublicFile(
            f,
            `mitra/${created.id}/files`
          );
          if (publicUrl) uploaded.push(publicUrl);
        } catch (e) {
          console.error("upload attachment error:", e?.message || e);
        }
      }
    }
    if (uploaded.length) {
      try {
        const agg = await prisma.mitra_files.aggregate({
          where: { mitra_id: created.id },
          _max: { sort: true },
        });
        const startSort = agg?._max?.sort ?? 0;

        const rows = uploaded.map((u, i) => ({
          mitra_id: created.id,
          file_url: u,
          sort: startSort + i + 1,
        }));

        await prisma.mitra_files.createMany({
          data: rows,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error("save attachment meta error:", e?.message || e);
      }
    }

    return json(
      {
        message: "Terima kasih! Pengajuan Anda akan direview.",
        data: { id: created.id, status: "PENDING" },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/mitra-dalam-negeri error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
