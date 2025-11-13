// app/api/college/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

// === Storage client (baru)
import storageClient from "@/app/utils/storageClient";
// === Cropper util (1:1 WebP)
import { cropFileTo1x1Webp } from "@/app/utils/cropper";

/* =========================
   Runtime & Defaults
========================= */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Config & Utils
========================= */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

// Currency dikunci IDR, field "type" dihapus → gunakan TEXT "jenjang"
const ALWAYS_CURRENCY = "IDR";

// Prefix jalur publik
const PUBLIC_PREFIX = "cms-oss";

/* ---------- Public URL helpers (konsisten dg consultants) ---------- */
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

/* ---------- Basic helpers ---------- */
function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(
  trans = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => trans.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function toNumeric(value) {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
async function ensureUniqueSlug(base) {
  const seed = slugify(base || "item");
  let slug = seed;
  let i = 1;
  while (true) {
    const exists = await prisma.college.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
    i += 1;
    slug = `${seed}-${i}`;
  }
}

/* ---------- Auth (NextAuth admin session) ---------- */
async function assertAdmin(req) {
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

/* ---------- Body Reader ---------- */
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

    for (const k of ["logo", "file", "logo_file"]) {
      const f = form.get(k);
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

/* ---------- Upload (pakai storageClient + CROP 1:1 WebP) ---------- */
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

function cropResultToFileLike(cropResult, collegeId) {
  if (cropResult?.file && typeof cropResult.file.arrayBuffer === "function") {
    return cropResult.file;
  }
  if (typeof Buffer === "undefined") {
    throw new Error("Buffer is not available in this environment.");
  }
  const raw = cropResult?.buffer;
  const nodeBuffer =
    raw && Buffer.isBuffer(raw) ? raw : Buffer.from(raw || []);
  const slice = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  );
  const ext = cropResult?.ext || "webp";
  return {
    name: `logo-${collegeId || "new"}.${ext}`,
    type: cropResult?.contentType || "image/webp",
    size: nodeBuffer.byteLength,
    arrayBuffer: async () => slice,
  };
}

async function uploadCollegeLogo(file, collegeId) {
  if (!file) return null;

  // Validasi tipe + ukuran
  await assertImageFileOrThrow(file);

  // Crop 1:1 ke WebP (server: pakai sharp, client: canvas)
  const cropped = await cropFileTo1x1Webp(file, {
    size: 720, // bisa diubah kalau mau lebih kecil/besar
    quality: 90,
  });

  const fileLike = cropResultToFileLike(cropped, collegeId);

  const res = await storageClient.uploadBufferWithPresign(fileLike, {
    folder: `${PUBLIC_PREFIX}/colleges/${collegeId}`,
    isPublic: true,
  });

  // simpan URL publik langsung ke DB
  return res.publicUrl || null;
}

/* ---------- Serializer ---------- */
function mapCollege(row, locale, fallback) {
  const t = pickTrans(row.college_translate || [], locale, fallback);
  return {
    id: row.id,
    admin_user_id: row.admin_user_id,
    slug: row.slug,
    country: row.country,
    jenjang: row.jenjang ?? null,
    website: row.website,
    mou_url: row.mou_url,
    logo_url: toPublicUrl(row.logo_url),
    address: row.address,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    tuition_min: row.tuition_min,
    tuition_max: row.tuition_max,
    living_cost_estimate: row.living_cost_estimate,
    currency: row.currency,
    contact_name: row.contact_name,
    no_telp: row.no_telp,
    email: row.email,
    created_at: row.created_at,
    updated_at: row.updated_at,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
  };
}

/* =========================
   GET /api/college (list)
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(
      100,
      Math.max(1, Number(searchParams.get("perPage") || 10))
    );
    const q = (searchParams.get("q") || "").trim();
    const country = searchParams.get("country") || undefined;
    const jenjangFilter = (
      searchParams.get("jenjang") ||
      searchParams.get("type") ||
      ""
    ).trim(); // alias 'type' utk backward-compat

    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = { deleted_at: null };
    if (country) where.country = country;

    const and = [];
    if (q) {
      and.push({
        OR: [
          { city: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
          {
            college_translate: {
              some: {
                locale: { in: locales },
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }
    if (jenjangFilter) {
      and.push({ jenjang: { contains: jenjangFilter, mode: "insensitive" } });
    }
    if (and.length) where.AND = and;

    // pastikan ada translation sesuai locales
    where.college_translate = { some: { locale: { in: locales } } };

    const rows = await prisma.college.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
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

    const data = rows.map((r) => mapCollege(r, locale, fallback));
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/college error:", err);
    return NextResponse.json(
      { message: "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}

/* =========================
   POST /api/college (create)
========================= */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);
    const { body, file } = await readBodyAndFile(req);

    const locale = normalizeLocale(body.locale);
    const name = String(body?.name || "").trim();
    if (!name)
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );

    const slug = body.slug ? slugify(body.slug) : await ensureUniqueSlug(name);

    // jenjang TEXT (ganti dari type)
    const jenjangRaw =
      body.jenjang !== undefined
        ? body.jenjang
        : body.type !== undefined
        ? body.type
        : null;

    const currency = ALWAYS_CURRENCY;
    const ownerId = body.admin_user_id || adminId;

    // Buat parent dulu → upload logo memakai id folder → update logo_url
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.college.create({
        data: {
          admin_user_id: ownerId,
          slug,
          country: body.country ?? null,
          jenjang: jenjangRaw ?? null,
          website: body.website ?? null,
          mou_url: body.mou_url ?? null,
          logo_url: null, // set nanti (file/string)
          address: body.address ?? null,
          city: body.city ?? null,
          state: body.state ?? null,
          postal_code: body.postal_code ?? null,
          tuition_min: toNumeric(body.tuition_min),
          tuition_max: toNumeric(body.tuition_max),
          living_cost_estimate: toNumeric(body.living_cost_estimate),
          currency,
          contact_name:
            body.contact_name !== undefined && body.contact_name !== null
              ? String(body.contact_name).slice(0, 191)
              : null,
          no_telp:
            body.no_telp !== undefined && body.no_telp !== null
              ? String(body.no_telp).slice(0, 32)
              : null,
          email:
            body.email !== undefined && body.email !== null
              ? String(body.email).toLowerCase().slice(0, 191)
              : null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: { id: true },
      });

      // translations (locale sumber)
      const description =
        body.description !== undefined && body.description !== null
          ? String(body.description)
          : null;

      await tx.college_translate.create({
        data: { id_college: parent.id, locale, name, description },
      });

      // auto translate ke EN (opsional)
      const autoTranslate =
        String(body.autoTranslate ?? "true").toLowerCase() !== "false";
      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          typeof description === "string"
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.college_translate.upsert({
          where: {
            id_college_locale: { id_college: parent.id, locale: EN_LOCALE },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_college: parent.id,
            locale: EN_LOCALE,
            name: nameEn || name,
            description: descEn ?? description,
          },
        });
      }

      // handle logo
      let finalLogo = null;
      if (file) {
        // FILE → crop 1:1 dan upload
        finalLogo = await uploadCollegeLogo(file, parent.id);
      } else if (body.logo_url !== undefined) {
        const trimmed = String(body.logo_url || "").trim();
        if (trimmed.length > 1024)
          throw Object.assign(new Error("BAD_LOGO_URL"), { status: 400 });
        // string logo_url tidak di-crop (diasumsikan sudah siap pakai)
        finalLogo = trimmed || null;
      }

      if (finalLogo) {
        await tx.college.update({
          where: { id: parent.id },
          data: { logo_url: finalLogo, updated_at: new Date() },
        });
      }

      return { id: parent.id, logo_url: finalLogo || null };
    });

    return NextResponse.json(
      {
        data: { id: created.id, slug, logo_url: toPublicUrl(created.logo_url) },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    if (err?.message === "UNSUPPORTED_TYPE")
      return NextResponse.json(
        { message: "Logo must be JPEG/PNG/WebP/SVG" },
        { status: 415 }
      );
    if (err?.message === "PAYLOAD_TOO_LARGE")
      return NextResponse.json({ message: "Logo max 10MB" }, { status: 413 });
    if (err?.message === "BAD_LOGO_URL")
      return NextResponse.json(
        { message: "logo_url must be at most 1024 characters" },
        { status: 400 }
      );

    console.error("POST /api/college error:", err);
    return NextResponse.json(
      { message: "Failed to create college" },
      { status: 500 }
    );
  }
}
