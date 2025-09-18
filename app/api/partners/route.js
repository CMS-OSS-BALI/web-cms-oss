import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
async function ensureUniqueSlug(base) {
  let slug = slugify(base);
  let i = 1;
  while (true) {
    const exists = await prisma.partners.findUnique({ where: { slug } }).catch(() => null);
    if (!exists) return slug;
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
}
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(trans = [], primary = DEFAULT_LOCALE, fallback = DEFAULT_LOCALE) {
  const by = (loc) => trans.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function toNumeric(value) {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });

  if (session.user.role && String(session.user.role).toUpperCase() === "ADMIN") {
    const admin = await prisma.admin_users.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!admin) throw new Response("Forbidden", { status: 403 });
    return { session, adminId: admin.id };
  }
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { session, adminId: admin.id };
}

function mapPartner(row, locale, fallback) {
  const translation = pickTrans(row.partners_translate || [], locale, fallback);
  return {
    id: row.id,
    admin_user_id: row.admin_user_id,
    slug: row.slug,
    country: row.country,
    type: row.type,
    website: row.website,
    mou_url: row.mou_url,
    logo_url: row.logo_url,
    address: row.address,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    tuition_min: row.tuition_min,
    tuition_max: row.tuition_max,
    living_cost_estimate: row.living_cost_estimate,
    currency: row.currency,
    contact: row.contact,
    created_at: row.created_at,
    updated_at: row.updated_at,
    locale_used: translation?.locale || null,
    name: translation?.name || null,
    description: translation?.description || null,
  };
}

/* ---------- GET /api/partners ---------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage") || 10)));
    const q = (searchParams.get("q") || "").trim();
    const country = searchParams.get("country") || undefined;
    const rawType = searchParams.get("type") || undefined;
    const type = rawType ? String(rawType).toUpperCase() : undefined;
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || DEFAULT_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = { deleted_at: null };
    if (country) where.country = country;
    if (type) where.type = type;

    const and = [];
    if (q) {
      and.push({
        OR: [
          { city: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
          { country: { contains: q, mode: "insensitive" } },
          {
            partners_translate: {
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
    where.partners_translate = { some: { locale: { in: locales } } };

    const [total, rows] = await Promise.all([
      prisma.partners.count({ where }),
      prisma.partners.findMany({
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
          contact: true,
          created_at: true,
          updated_at: true,
          partners_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((row) => mapPartner(row, locale, fallback));

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
      data,
    });
  } catch (err) {
    console.error("GET /api/partners error:", err);
    return NextResponse.json(
      { message: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}

/* ---------- POST /api/partners ---------- */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin();

    const body = await req.json().catch(() => ({}));
    const locale = normalizeLocale(body.locale);
    const name = (body?.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { message: "name is required" },
        { status: 400 }
      );
    }

    const slug = body.slug ? slugify(body.slug) : await ensureUniqueSlug(name);
    const normType = body.type ? String(body.type).toUpperCase() : null;
    const currency = (body.currency || "IDR").toUpperCase().slice(0, 3);
    const contact = body.contact ?? null;
    const logoUrl =
      body.logo_url !== undefined && body.logo_url !== null
        ? String(body.logo_url).trim() || null
        : null;
    if (logoUrl && logoUrl.length > 1024) {
      return NextResponse.json(
        { message: "logo_url must be at most 1024 characters" },
        { status: 400 }
      );
    }
    const ownerId = body.admin_user_id || adminId;
    if (!ownerId) {
      return NextResponse.json(
        { message: "admin_user_id required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.partners.create({
        data: {
          admin_user_id: ownerId,
          slug,
          country: body.country ?? null,
          type: normType,
          website: body.website ?? null,
          mou_url: body.mou_url ?? null,
          logo_url: logoUrl,
          address: body.address ?? null,
          city: body.city ?? null,
          state: body.state ?? null,
          postal_code: body.postal_code ?? null,
          tuition_min: toNumeric(body.tuition_min),
          tuition_max: toNumeric(body.tuition_max),
          living_cost_estimate: toNumeric(body.living_cost_estimate),
          currency,
          contact,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const description =
        body.description !== undefined && body.description !== null
          ? String(body.description)
          : null;

      await tx.partners_translate.create({
        data: {
          id_partners: created.id,
          locale,
          name,
          description,
        },
      });

      if (locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.partners_translate.upsert({
          where: { id_partners_locale: { id_partners: created.id, locale: EN_LOCALE } },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_partners: created.id,
            locale: EN_LOCALE,
            name: nameEn || name,
            description: descEn ?? description,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ id: result.id, locale, name }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/partners error:", err);
    return NextResponse.json(
      { message: "Failed to create partner" },
      { status: 500 }
    );
  }
}

