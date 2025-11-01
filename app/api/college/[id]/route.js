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
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

// ⚠️ type (enum) sudah dihapus. Currency tetap dikunci IDR.
const ALWAYS_CURRENCY = "IDR";

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
/** path -> public URL */
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Accept NextAuth OR x-admin-key header */
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

/** Read form-data or JSON */
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
    for (const name of ["logo", "file", "logo_file", "logo_url"]) {
      const f = form.get(name);
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
  return objectPath;
}

/* -------------------- GET (detail) -------------------- */
export async function GET(req, { params }) {
  try {
    const identRaw = params?.id;
    if (!identRaw) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }
    const ident = String(identRaw);

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    // ✅ dukung ID atau slug
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
        jenjang: true, // <- ganti dari type
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

    if (!row) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

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

/* -------------------- PATCH / PUT (update) -------------------- */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const { body, file } = await readBodyAndFile(req);
    const locale = normalizeLocale(body.locale);

    const patch = {};

    if (body.country !== undefined) patch.country = body.country ?? null;

    // ❌ patch.type = ALWAYS_TYPE;  ->  ✅ jenjang TEXT
    if (body.jenjang !== undefined) {
      patch.jenjang = body.jenjang ?? null;
    } else if (body.type !== undefined) {
      // backward-compat: kalau klien lama masih kirim 'type'
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

    if (file) {
      try {
        patch.logo_url = await uploadCollegeLogo(file);
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
      if (trimmed && trimmed.length > 1024)
        return NextResponse.json(
          { message: "logo_url must be at most 1024 characters" },
          { status: 400 }
        );
      patch.logo_url = trimmed || null;
    }

    if (body.slug) {
      patch.slug = slugify(body.slug);
    } else if (body.name && locale === DEFAULT_LOCALE) {
      patch.slug = await uniqueSlugForUpdate(body.name, id);
    }

    if (Object.keys(patch).length) patch.updated_at = new Date();

    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const autoTranslate =
      String(body.autoTranslate ?? "false").toLowerCase() === "true";

    await prisma.$transaction(async (tx) => {
      if (Object.keys(patch).length) {
        await tx.college.update({ where: { id }, data: patch });
      }

      if (hasName || hasDescription) {
        const updateT = {};
        if (hasName) {
          const nm = String(body.name || "").trim();
          if (!nm)
            return NextResponse.json(
              { message: "name is required" },
              { status: 400 }
            );
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

    // ambil logo terbaru untuk response publik
    const updated = await prisma.college.findUnique({
      where: { id },
      select: { id: true, logo_url: true },
    });

    return NextResponse.json({
      data: { id, logo_url: toPublicUrl(updated?.logo_url || null) },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`PATCH /api/college/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update college" },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE (soft) -------------------- */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.college.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
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
