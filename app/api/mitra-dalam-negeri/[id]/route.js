// app/api/mitra-dalam-negeri/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import storageClient from "@/app/utils/storageClient";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const NIK_LENGTH = 16;
const DIGIT_ONLY = /\D+/g;

/* =========================
   Storage & URL helpers
========================= */
const PUBLIC_PREFIX = "cms-oss";

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
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
const MAX_FILE_BYTES = 20 * 1024 * 1024;

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
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/${folder}`.replace(/\/+/g, "/"),
    isPublic: true,
  });
  return res?.publicUrl || null;
}

/* =========================
   Shared helpers
========================= */
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

function buildUpdateData(payload) {
  const allow = [
    // org info
    "email",
    "phone",
    "website",
    "instagram",
    "twitter",
    "mou_url",
    "image_url",
    // address
    "address",
    "city",
    "province",
    "postal_code",
    // contact
    "contact_name",
    "contact_position",
    "contact_whatsapp",
  ];
  const data = {};
  for (const key of allow) {
    if (payload[key] !== undefined)
      data[key] = payload[key] === null ? null : String(payload[key]);
  }
  if (payload.category_id !== undefined) {
    data.category_id = payload.category_id ? String(payload.category_id) : null;
  }
  if (Object.keys(data).length) data.updated_at = new Date();
  return data;
}

// form-data / urlencoded / json + ambil file
async function readBodyAndFiles(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    let imageFile = null;
    const attachments = [];
    const deleteIds = [];

    for (const [k, v] of form.entries()) {
      const isFile = typeof File !== "undefined" && v instanceof File;
      if (!isFile) {
        if (k === "attachments_to_delete") deleteIds.push(String(v));
        else body[k] = v;
        continue;
      }
      if (!imageFile && (k === "image" || k === "logo" || k === "image_file")) {
        imageFile = v;
        continue;
      }
      if (
        ["files", "attachments", "dokumen"].includes(k) ||
        k.toLowerCase().includes("attachment")
      ) {
        attachments.push(v);
        continue;
      }
    }
    return { body, imageFile, attachments, deleteIds };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  const deleteIds = Array.isArray(body.attachments_to_delete)
    ? body.attachments_to_delete.map(String)
    : [];
  return { body, imageFile: null, attachments: [], deleteIds };
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

/* ---------- GET detail (admin) ---------- */
export async function GET(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return json(
        { error: { code: "BAD_REQUEST", message: "id kosong" } },
        { status: 400 }
      );

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || EN_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.mitra.findFirst({
      where: { id },
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
    });
    if (!row)
      return json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 }
      );

    const files = await prisma.mitra_files.findMany({
      where: { mitra_id: id },
      orderBy: [{ sort: "asc" }, { created_at: "asc" }],
      select: { id: true, file_url: true, sort: true, created_at: true },
    });

    const t = pickTrans(row.mitra_translate || [], locale, fallback);
    const ct = pickTrans(
      row.mitra_categories?.mitra_categories_translate || [],
      locale,
      fallback
    );
    const { mitra_translate, ...base } = row;

    return json({
      message: "OK",
      data: {
        ...base,
        image_url: toPublicUrl(base.image_url),
        mou_url: toPublicUrl(base.mou_url),
        category: row.mitra_categories
          ? {
              id: row.mitra_categories.id,
              slug: row.mitra_categories.slug,
              name: ct?.name ?? null,
              locale_used: ct?.locale ?? null,
            }
          : null,
        merchant_name: t?.name || null,
        about: t?.description || null,
        locale_used: t?.locale || null,
        files: files.map((f) => ({
          ...f,
          file_url: toPublicUrl(f.file_url),
        })),
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    console.error(`GET /api/mitra-dalam-negeri/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}

export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

/* ---------- PATCH (admin, + storage baru) ---------- */
export async function PATCH(req, { params }) {
  try {
    const admin = await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return json(
        { error: { code: "BAD_REQUEST", message: "id kosong" } },
        { status: 400 }
      );

    const { body, imageFile, attachments, deleteIds } = await readBodyAndFiles(
      req
    );
    const locale = normalizeLocale(body.locale);
    const data = buildUpdateData(body);
    const wantsNikUpdate =
      body.nik !== undefined || body.ktp_number !== undefined;
    if (wantsNikUpdate) {
      const nik = sanitizeNik(body.nik ?? body.ktp_number);
      if (!nik)
        return json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "NIK wajib diisi.",
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
      data.nik = nik;
      data.updated_at = new Date();
    }

    // category update (id/slug)
    if (body.category_id !== undefined || body.category_slug !== undefined) {
      try {
        data.category_id = await resolveCategoryId({
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
    }

    // review workflow
    if (body.status !== undefined) {
      const next = String(body.status).toUpperCase();
      if (!["PENDING", "APPROVED", "DECLINED"].includes(next)) {
        return json(
          { error: { code: "BAD_REQUEST", message: "status tidak valid" } },
          { status: 400 }
        );
      }
      if (next === "APPROVED" || next === "DECLINED") {
        data.status = next;
        data.review_notes =
          body.review_notes !== undefined
            ? String(body.review_notes || "")
            : null;
        data.reviewed_by = admin.id;
        data.reviewed_at = new Date();
      } else {
        data.status = "PENDING";
        data.review_notes = null;
        data.reviewed_by = null;
        data.reviewed_at = null;
      }
    }

    // update nama/desc terjemahan
    const hasName = body.merchant_name !== undefined;
    const hasAbout = body.about !== undefined;
    if (hasName) {
      const trimmed = String(body.merchant_name || "").trim();
      if (!trimmed)
        return json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "merchant_name wajib diisi",
            },
          },
          { status: 400 }
        );
      body.merchant_name = trimmed;
    }

    // Upload image baru (opsional) di luar transaksi
    let postCleanupImageUrl = null;
    if (imageFile) {
      try {
        await assertImageFileOrThrow(imageFile);
        const existing = await prisma.mitra.findUnique({
          where: { id },
          select: { image_url: true },
        });
        const newUrl = await uploadPublicFile(imageFile, `mitra/${id}`);
        data.image_url = newUrl;
        if (existing?.image_url && existing.image_url !== newUrl) {
          postCleanupImageUrl = existing.image_url;
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

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.mitra.update({ where: { id }, data });
      }

      // translasi
      if (hasName || hasAbout) {
        const tUpd = {};
        if (hasName) tUpd.name = body.merchant_name;
        if (hasAbout)
          tUpd.description = body.about === null ? null : String(body.about);

        await tx.mitra_translate.upsert({
          where: { id_merchants_locale: { id_merchants: id, locale } },
          update: tUpd,
          create: {
            id: randomUUID(),
            id_merchants: id,
            locale,
            name: tUpd.name || body.merchant_name || "",
            description:
              tUpd.description !== undefined ? tUpd.description : null,
          },
        });

        if (locale !== EN_LOCALE && (hasName || hasAbout)) {
          const [nameEn, aboutEn] = await Promise.all([
            hasName
              ? translate(body.merchant_name, locale, EN_LOCALE)
              : Promise.resolve(undefined),
            typeof tUpd.description === "string"
              ? translate(tUpd.description, locale, EN_LOCALE)
              : Promise.resolve(tUpd.description),
          ]);
          const enUpdate = {};
          if (hasName) enUpdate.name = nameEn || body.merchant_name;
          if (hasAbout)
            enUpdate.description = aboutEn ?? tUpd.description ?? null;

          if (Object.keys(enUpdate).length) {
            await tx.mitra_translate.upsert({
              where: {
                id_merchants_locale: { id_merchants: id, locale: EN_LOCALE },
              },
              update: enUpdate,
              create: {
                id: randomUUID(),
                id_merchants: id,
                locale: EN_LOCALE,
                name: enUpdate.name || body.merchant_name || "",
                description:
                  enUpdate.description !== undefined
                    ? enUpdate.description
                    : tUpd.description ?? null,
              },
            });
          }
        }
      }

      // hapus lampiran (opsional)
      if (deleteIds?.length) {
        const toDel = await tx.mitra_files.findMany({
          where: { id: { in: deleteIds }, mitra_id: id },
          select: { id: true, file_url: true },
        });
        if (toDel.length) {
          await tx.mitra_files.deleteMany({
            where: { id: { in: toDel.map((x) => x.id) } },
          });
          const paths = toDel.map((x) => x.file_url).filter(Boolean);
          if (paths.length) await removeStorageObjects(paths);
        }
      }

      // upload lampiran baru (opsional)
      if (attachments?.length) {
        let currentSort =
          (
            await tx.mitra_files.aggregate({
              where: { mitra_id: id },
              _max: { sort: true },
            })
          )._max?.sort ?? 0;

        for (const f of attachments) {
          try {
            await assertAttachmentFileOrThrow(f);
            const publicUrl = await uploadPublicFile(f, `mitra/${id}/files`);
            if (publicUrl) {
              currentSort += 1;
              await tx.mitra_files.create({
                data: { mitra_id: id, file_url: publicUrl, sort: currentSort },
              });
            }
          } catch (e) {
            console.error("upload attachment error:", e?.message || e);
          }
        }
      }
    });

    // cleanup image lama (best-effort)
    if (postCleanupImageUrl) {
      try {
        await removeStorageObjects([postCleanupImageUrl]);
      } catch {}
    }

    return json({ message: "OK", data: { id } });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    console.error(`PATCH /api/mitra-dalam-negeri/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}

/* ---------- DELETE (admin) ---------- */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";
    const restore = searchParams.get("restore") === "1";

    if (!id)
      return json(
        { error: { code: "BAD_REQUEST", message: "id kosong" } },
        { status: 400 }
      );
    if (hard && restore)
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Gunakan salah satu: hard=1 atau restore=1",
          },
        },
        { status: 400 }
      );

    if (restore) {
      const restored = await prisma.mitra.update({
        where: { id },
        data: { deleted_at: null, updated_at: new Date() },
      });
      return json({ message: "Restored", data: { id: restored.id } });
    }

    if (hard) {
      // hapus lampiran & gambar di storage (best-effort)
      try {
        const [files, parent] = await Promise.all([
          prisma.mitra_files.findMany({
            where: { mitra_id: id },
            select: { file_url: true },
          }),
          prisma.mitra.findUnique({
            where: { id },
            select: { image_url: true },
          }),
        ]);
        const paths = [
          ...files.map((x) => x.file_url).filter(Boolean),
          parent?.image_url || null,
        ].filter(Boolean);
        if (paths.length) await removeStorageObjects(paths);
        await prisma.mitra_files.deleteMany({ where: { mitra_id: id } });
      } catch {}
      await prisma.mitra.delete({ where: { id } });
      return json({ message: "Deleted permanently", data: { id } });
    }

    const deleted = await prisma.mitra.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return json({ message: "Soft deleted", data: { id: deleted.id } });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401)
      return json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    console.error(`DELETE /api/mitra-dalam-negeri/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
