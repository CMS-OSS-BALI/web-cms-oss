// app/api/college/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

// Storage client baru (konsisten dengan consultants)
import storageClient from "@/app/utils/storageClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Config & helpers
========================= */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const ALWAYS_CURRENCY = "IDR";
const PUBLIC_PREFIX = "cms-oss";

/* ---------- Public URL helpers (sama seperti di list/create) ---------- */
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

/* ---------- URL → storage key (untuk cleanup) ---------- */
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  return null;
}

/* ---------- Best-effort remover (gateway) ---------- */
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
  } catch {}
}

/* ---------- misc helpers ---------- */
function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
async function uniqueSlugForUpdate(base, excludeId) {
  const seed = slugify(base || "item");
  let candidate = seed;
  let i = 1;
  while (true) {
    const exists = await prisma.college.findFirst({
      where: { slug: candidate, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (!exists) return candidate;
    i += 1;
    candidate = `${seed}-${i}`;
  }
}
function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function toNumeric(value) {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Auth ---------- */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw new Response("Forbidden", { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/* ---------- Body reader ---------- */
async function readBodyAndFile(req) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = contentType.startsWith("multipart/form-data");
  const isUrlEncoded = contentType.startsWith(
    "application/x-www-form-urlencoded"
  );

  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const name of ["logo", "file", "logo_file"]) {
      const f = form.get(name);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/* ---------- Upload (pakai storageClient) ---------- */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (type && !ALLOWED_IMAGE_TYPES.has(type))
    throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
}
async function uploadCollegeLogo(file, collegeId) {
  if (!file) return null;
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/colleges/${collegeId}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/* =========================
   GET /api/college/:id (by id or slug)
========================= */
export async function GET(req, { params }) {
  try {
    const identRaw = params?.id;
    if (!identRaw)
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    const ident = String(identRaw);

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ident
      );

    const where = isUuid
      ? { id: ident, deleted_at: null }
      : { slug: ident.toLowerCase(), deleted_at: null };

    const row = await prisma.college.findFirst({
      where,
      select: {
        id: true,
        admin_user_id: true,
        slug: true,
        country: true,
        jenjang: true,
        website: true,
        mou_url: true,
        logo_url: true,
        address: true,
        city: true,
        state: true,
        postal_code: true,
        tuition_min: true,
        tuition_max: true,
        living_cost_estimate: true,
        currency: true,
        contact_name: true,
        no_telp: true,
        email: true,
        created_at: true,
        updated_at: true,
        college_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!row)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const t = pickTrans(row.college_translate, locale, fallback);
    const { college_translate, ...base } = row;

    return NextResponse.json({
      ...base,
      logo_url: toPublicUrl(base.logo_url),
      locale_used: t?.locale || null,
      name: t?.name || null,
      description: t?.description || null,
    });
  } catch (err) {
    console.error(`GET /api/college/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch college" },
      { status: 500 }
    );
  }
}

/* =========================
   PATCH / PUT /api/college/:id
========================= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    // snapshot existing (untuk compare logo lama)
    const existing = await prisma.college.findUnique({
      where: { id },
      select: { id: true, slug: true, logo_url: true },
    });
    if (!existing)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const { body, file } = await readBodyAndFile(req);
    const locale = normalizeLocale(body.locale);

    const patch = {};
    if (body.country !== undefined) patch.country = body.country ?? null;

    // jenjang TEXT (back-compat: type)
    if (body.jenjang !== undefined) {
      patch.jenjang = body.jenjang ?? null;
    } else if (body.type !== undefined) {
      patch.jenjang = body.type ?? null;
    }

    if (body.website !== undefined) patch.website = body.website ?? null;
    if (body.mou_url !== undefined) patch.mou_url = body.mou_url ?? null;
    if (body.address !== undefined) patch.address = body.address ?? null;
    if (body.city !== undefined) patch.city = body.city ?? null;
    if (body.state !== undefined) patch.state = body.state ?? null;
    if (body.postal_code !== undefined)
      patch.postal_code = body.postal_code ?? null;

    if (body.tuition_min !== undefined)
      patch.tuition_min = toNumeric(body.tuition_min);
    if (body.tuition_max !== undefined)
      patch.tuition_max = toNumeric(body.tuition_max);
    if (body.living_cost_estimate !== undefined)
      patch.living_cost_estimate = toNumeric(body.living_cost_estimate);

    patch.currency = ALWAYS_CURRENCY;

    if (body.contact_name !== undefined)
      patch.contact_name =
        body.contact_name !== null
          ? String(body.contact_name).slice(0, 191)
          : null;
    if (body.no_telp !== undefined)
      patch.no_telp =
        body.no_telp !== null ? String(body.no_telp).slice(0, 32) : null;
    if (body.email !== undefined)
      patch.email =
        body.email !== null
          ? String(body.email).toLowerCase().slice(0, 191)
          : null;

    // slug rules
    if (body.slug) {
      patch.slug = slugify(body.slug);
    } else if (body.name && locale === DEFAULT_LOCALE) {
      patch.slug = await uniqueSlugForUpdate(body.name, id);
    }

    // logo handling
    let newLogoUrl = null;
    if (file) {
      try {
        newLogoUrl = await uploadCollegeLogo(file, id);
      } catch (e) {
        if (e?.message === "UNSUPPORTED_TYPE")
          return NextResponse.json(
            { message: "Logo must be JPEG/PNG/WebP/SVG" },
            { status: 415 }
          );
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return NextResponse.json(
            { message: "Logo max 10MB" },
            { status: 413 }
          );
        throw e;
      }
    } else if (body.logo_url !== undefined) {
      const trimmed = String(body.logo_url || "").trim();
      if (trimmed && trimmed.length > 1024)
        return NextResponse.json(
          { message: "logo_url must be at most 1024 characters" },
          { status: 400 }
        );
      newLogoUrl = trimmed || null;
    }
    if (newLogoUrl !== null) patch.logo_url = newLogoUrl;

    if (Object.keys(patch).length) patch.updated_at = new Date();

    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const autoTranslate =
      String(body.autoTranslate ?? "false").toLowerCase() === "true";

    // transaksi: update parent + translations
    await prisma.$transaction(async (tx) => {
      if (Object.keys(patch).length) {
        await tx.college.update({ where: { id }, data: patch });
      }

      if (hasName || hasDescription) {
        const updateT = {};
        if (hasName) {
          const nm = String(body.name || "").trim();
          if (!nm) {
            throw Object.assign(new Error("NAME_REQUIRED"), { status: 400 });
          }
          updateT.name = nm;
        }
        if (hasDescription) {
          updateT.description =
            body.description === null ? null : String(body.description);
        }

        await tx.college_translate.upsert({
          where: { id_college_locale: { id_college: id, locale } },
          update: updateT,
          create: {
            id_college: id,
            locale,
            name: updateT.name || String(body.name || "(no title)"),
            description:
              updateT.description !== undefined ? updateT.description : null,
          },
        });

        if (autoTranslate && locale !== EN_LOCALE) {
          const sourceName = hasName ? updateT.name : undefined;
          const sourceDesc = hasDescription ? updateT.description : undefined;

          const [nameEn, descEn] = await Promise.all([
            sourceName
              ? translate(sourceName, locale, EN_LOCALE)
              : Promise.resolve(undefined),
            typeof sourceDesc === "string"
              ? translate(sourceDesc, locale, EN_LOCALE)
              : Promise.resolve(sourceDesc),
          ]);

          const enUpdate = {};
          if (sourceName !== undefined) enUpdate.name = nameEn || sourceName;
          if (sourceDesc !== undefined)
            enUpdate.description = descEn ?? sourceDesc ?? null;

          if (Object.keys(enUpdate).length) {
            await tx.college_translate.upsert({
              where: {
                id_college_locale: { id_college: id, locale: EN_LOCALE },
              },
              update: enUpdate,
              create: {
                id_college: id,
                locale: EN_LOCALE,
                name: enUpdate.name || updateT.name || "(no title)",
                description:
                  enUpdate.description !== undefined
                    ? enUpdate.description
                    : sourceDesc ?? null,
              },
            });
          }
        }
      }
    });

    // cleanup logo lama jika berubah (best-effort)
    try {
      if (
        newLogoUrl !== null &&
        existing.logo_url &&
        existing.logo_url !== newLogoUrl
      ) {
        await removeStorageObjects([existing.logo_url]);
      }
    } catch {}

    const updated = await prisma.college.findUnique({
      where: { id },
      select: { id: true, logo_url: true },
    });

    return NextResponse.json({
      data: { id, logo_url: toPublicUrl(updated?.logo_url || null) },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err?.status === 400 && err?.message === "NAME_REQUIRED")
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );
    console.error(`PATCH /api/college/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update college" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE (soft) /api/college/:id
========================= */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.college.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    return NextResponse.json({ message: "deleted", data: { id: deleted.id } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`DELETE /api/college/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete college" },
      { status: 500 }
    );
  }
}
