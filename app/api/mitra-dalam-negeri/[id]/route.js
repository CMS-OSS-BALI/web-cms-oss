// app/api/mitra-dalam-negeri/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET;

/* ------------ shared helpers ------------ */
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
function safeExt(filename = "") {
  const ext = String(filename).split(".").pop();
  return ext ? `.${ext.toLowerCase()}` : "";
}
function randName(ext = "") {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}
async function uploadToSupabase(
  file,
  prefix,
  { allowedTypes = [], maxMB = 20 } = {}
) {
  if (!file) return null;
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");
  const size = file.size || 0;
  const type = file.type || "application/octet-stream";
  if (size > maxMB * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (allowedTypes.length && type && !allowedTypes.includes(type)) {
    const err = new Error("UNSUPPORTED_TYPE");
    err.meta = { accepted: allowedTypes };
    throw err;
  }
  const ext = safeExt(file.name);
  const objectPath = `${prefix}/${new Date()
    .toISOString()
    .slice(0, 10)}/${randName(ext)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return { path: objectPath, mime: type, size };
}
async function deleteFromSupabase(paths = []) {
  if (!paths.length) return;
  try {
    await supabaseAdmin.storage.from(BUCKET).remove(paths);
  } catch (e) {
    console.error("supabase remove error:", e?.message || e);
  }
}
async function resolveCategoryId({ category_id, category_slug }) {
  const id = category_id ? String(category_id).trim() : "";
  const slug = category_slug ? String(category_slug).trim() : "";
  if (!id && !slug) return null;
  const found = await prisma.mitra_dalam_negeri_categories.findFirst({
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

    const row = await prisma.mitra_dalam_negeri.findFirst({
      where: { id },
      include: {
        mitra_dalam_negeri_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
        category: {
          include: {
            translate: {
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

    const t = pickTrans(
      row.mitra_dalam_negeri_translate || [],
      locale,
      fallback
    );
    const ct = pickTrans(row.category?.translate || [], locale, fallback);
    const { mitra_dalam_negeri_translate, ...base } = row;

    return json({
      message: "OK",
      data: {
        ...base,
        category: row.category
          ? {
              id: row.category.id,
              slug: row.category.slug,
              name: ct?.name ?? null,
              locale_used: ct?.locale ?? null,
            }
          : null,
        merchant_name: t?.name || null,
        about: t?.description || null,
        locale_used: t?.locale || null,
        files,
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

/* ---------- PATCH (admin, + upload Supabase) ---------- */
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

    // category update (accept id or slug)
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

    // upload image baru (opsional)
    if (imageFile) {
      try {
        const up = await uploadToSupabase(imageFile, `mitra/images`, {
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/svg+xml",
          ],
          maxMB: 10,
        });
        data.image_url = up.path;
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
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return json(
            { error: { code: "SERVER_ERROR", message: "Bucket belum diset" } },
            { status: 500 }
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
        await tx.mitra_dalam_negeri.update({ where: { id }, data });
      }

      // translasi
      if (hasName || hasAbout) {
        const tUpd = {};
        if (hasName) tUpd.name = body.merchant_name;
        if (hasAbout)
          tUpd.description = body.about === null ? null : String(body.about);

        await tx.mitra_dalam_negeri_translate.upsert({
          where: { id_merchants_locale: { id_merchants: id, locale } },
          update: tUpd,
          create: {
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
            await tx.mitra_dalam_negeri_translate.upsert({
              where: {
                id_merchants_locale: { id_merchants: id, locale: EN_LOCALE },
              },
              update: enUpdate,
              create: {
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
          if (paths.length) await deleteFromSupabase(paths);
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
            const up = await uploadToSupabase(f, `mitra/files/${id}`, {
              allowedTypes: [
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
              ],
              maxMB: 20,
            });
            currentSort += 1;
            await tx.mitra_files.create({
              data: { mitra_id: id, file_url: up.path, sort: currentSort },
            });
          } catch (e) {
            console.error("upload attachment error:", e?.message || e);
          }
        }
      }
    });

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
      const restored = await prisma.mitra_dalam_negeri.update({
        where: { id },
        data: { deleted_at: null, updated_at: new Date() },
      });
      return json({ message: "Restored", data: { id: restored.id } });
    }

    if (hard) {
      // hapus lampiran di storage juga
      try {
        const files = await prisma.mitra_files.findMany({
          where: { mitra_id: id },
          select: { file_url: true },
        });
        const paths = files.map((x) => x.file_url).filter(Boolean);
        if (paths.length) await deleteFromSupabase(paths);
        await prisma.mitra_files.deleteMany({ where: { mitra_id: id } });
      } catch {}
      await prisma.mitra_dalam_negeri.delete({ where: { id } });
      return json({ message: "Deleted permanently", data: { id } });
    }

    const deleted = await prisma.mitra_dalam_negeri.update({
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
