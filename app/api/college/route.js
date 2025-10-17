// app/api/college/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- utils -------------------- */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const BUCKET = process.env.SUPABASE_BUCKET;
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || ""; // set in .env for Postman
const ALWAYS_TYPE = "FOREIGN"; // 🔒 always FOREIGN
const ALWAYS_CURRENCY = "IDR"; // 🔒 always IDR

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
/** path in storage -> public HTTP URL */
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
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

/** Accept NextAuth session OR x-admin-key header (for Postman) */
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

/** Read JSON or multipart form-data (surface File under 'logo' / 'file' / 'logo_file' / 'logo_url') */
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

    const tryKeys = ["logo", "file", "logo_file", "logo_url"]; // ⬅️ fleksibel
    for (const k of tryKeys) {
      const f = form.get(k);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }

    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue;
      body[k] = v;
    }
    return { body, file };
  }

  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/** Upload logo to Supabase (optional) */
async function uploadCollegeLogo(file) {
  if (!file) return null;
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const size = file.size || 0;
  const type = file.type || "";
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (size > 10 * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `college-logos/${new Date()
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
  return objectPath; // store this into DB (path)
}

function mapCollege(row, locale, fallback) {
  const t = pickTrans(row.college_translate || [], locale, fallback);
  return {
    id: row.id,
    admin_user_id: row.admin_user_id,
    slug: row.slug,
    country: row.country,
    type: row.type,
    website: row.website,
    mou_url: row.mou_url,
    logo_url: toPublicUrl(row.logo_url), // ⬅️ public URL keluar
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

/* -------------------- GET (list) -------------------- */
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
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = { deleted_at: null, type: ALWAYS_TYPE };
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
    if (and.length) where.AND = and;
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
        type: true,
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

/* -------------------- POST (create) -------------------- */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);

    const { body, file } = await readBodyAndFile(req);
    const locale = normalizeLocale(body.locale);
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );
    }

    const slug = body.slug ? slugify(body.slug) : await ensureUniqueSlug(name);

    const normType = ALWAYS_TYPE;
    const currency = ALWAYS_CURRENCY;

    let logo_url = null;
    if (file) {
      try {
        logo_url = await uploadCollegeLogo(file);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return NextResponse.json(
            { message: "Logo max 10MB" },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return NextResponse.json(
            { message: "Logo must be JPEG/PNG/WebP/SVG" },
            { status: 415 }
          );
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return NextResponse.json(
            { message: "Supabase bucket is not configured" },
            { status: 500 }
          );
        console.error("uploadCollegeLogo error:", e);
        return NextResponse.json(
          { message: "Upload logo failed" },
          { status: 500 }
        );
      }
    } else if (body.logo_url !== undefined) {
      const trimmed = String(body.logo_url || "").trim();
      if (trimmed.length > 1024)
        return NextResponse.json(
          { message: "logo_url must be at most 1024 characters" },
          { status: 400 }
        );
      logo_url = trimmed || null;
    }

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";
    const ownerId = body.admin_user_id || adminId;

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.college.create({
        data: {
          admin_user_id: ownerId,
          slug,
          country: body.country ?? null,
          type: normType,
          website: body.website ?? null,
          mou_url: body.mou_url ?? null,
          logo_url,
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
      });

      const description =
        body.description !== undefined && body.description !== null
          ? String(body.description)
          : null;

      await tx.college_translate.create({
        data: { id_college: parent.id, locale, name, description },
      });

      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
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

      return parent;
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          slug: created.slug,
          logo_url: toPublicUrl(logo_url), // ⬅️ public URL di response
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/college error:", err);
    return NextResponse.json(
      { message: "Failed to create college" },
      { status: 500 }
    );
  }
}
