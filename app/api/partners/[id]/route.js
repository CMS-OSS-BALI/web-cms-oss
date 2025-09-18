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
async function uniqueSlugForUpdate(base, excludeId) {
  let candidate = slugify(base);
  let i = 1;
  while (true) {
    const exists = await prisma.partners.findFirst({
      where: { slug: candidate, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (!exists) return candidate;
    i += 1;
    candidate = `${slugify(base)}-${i}`;
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

/* ---------- GET /api/partners/:id ---------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || DEFAULT_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.partners.findFirst({
      where: { id, deleted_at: null },
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
    });

    if (!row) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const translation = pickTrans(row.partners_translate || [], locale, fallback);
    const { partners_translate: _translations, ...base } = row;

    return NextResponse.json({
      ...base,
      locale_used: translation?.locale || null,
      name: translation?.name || null,
      description: translation?.description || null,
    });
  } catch (err) {
    console.error(`GET /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch partner" },
      { status: 500 }
    );
  }
}

/* ---------- PATCH /api/partners/:id ---------- */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const locale = normalizeLocale(body.locale);

    const data = {};
    if (body.country !== undefined) data.country = body.country;
    if (body.type !== undefined) data.type = body.type ? String(body.type).toUpperCase() : null;
    if (body.website !== undefined) data.website = body.website ?? null;
    if (body.mou_url !== undefined) data.mou_url = body.mou_url ?? null;
    if (body.logo_url !== undefined) {
      const trimmedLogo =
        body.logo_url !== null ? String(body.logo_url).trim() || null : null;
      if (trimmedLogo && trimmedLogo.length > 1024) {
        return NextResponse.json(
          { message: "logo_url must be at most 1024 characters" },
          { status: 400 }
        );
      }
      data.logo_url = trimmedLogo;
    }
    if (body.address !== undefined) data.address = body.address ?? null;
    if (body.city !== undefined) data.city = body.city ?? null;
    if (body.state !== undefined) data.state = body.state ?? null;
    if (body.postal_code !== undefined) data.postal_code = body.postal_code ?? null;
    if (body.tuition_min !== undefined) data.tuition_min = toNumeric(body.tuition_min);
    if (body.tuition_max !== undefined) data.tuition_max = toNumeric(body.tuition_max);
    if (body.living_cost_estimate !== undefined)
      data.living_cost_estimate = toNumeric(body.living_cost_estimate);
    if (body.currency !== undefined)
      data.currency = body.currency ? String(body.currency).toUpperCase().slice(0, 3) : null;
    if (body.contact !== undefined) data.contact = body.contact ?? null;

    let slug;
    if (body.slug) {
      slug = slugify(body.slug);
    } else if (body.name && locale === DEFAULT_LOCALE) {
      slug = await uniqueSlugForUpdate(body.name, id);
    }
    if (slug) data.slug = slug;

    if (Object.keys(data).length) data.updated_at = new Date();

    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    if (hasName) {
      const trimmed = String(body.name || "").trim();
      if (!trimmed) {
        return NextResponse.json({ message: "name is required" }, { status: 400 });
      }
      body.name = trimmed;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.partners.update({ where: { id }, data });
      }

      if (hasName || hasDescription) {
        const translationUpdate = {};
        if (hasName) translationUpdate.name = body.name;
        if (hasDescription) {
          translationUpdate.description =
            body.description === null ? null : String(body.description);
        }

        await tx.partners_translate.upsert({
          where: { id_partners_locale: { id_partners: id, locale } },
          update: translationUpdate,
          create: {
            id_partners: id,
            locale,
            name: translationUpdate.name || body.name || "",
            description:
              translationUpdate.description !== undefined
                ? translationUpdate.description
                : null,
          },
        });

        if (locale !== EN_LOCALE && (hasName || hasDescription)) {
          const sourceName = hasName ? body.name : undefined;
          const sourceDesc = hasDescription ? translationUpdate.description : undefined;

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
          if (sourceDesc !== undefined) enUpdate.description = descEn ?? sourceDesc ?? null;

          if (Object.keys(enUpdate).length) {
            await tx.partners_translate.upsert({
              where: { id_partners_locale: { id_partners: id, locale: EN_LOCALE } },
              update: enUpdate,
              create: {
                id_partners: id,
                locale: EN_LOCALE,
                name: enUpdate.name || body.name,
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

    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`PATCH /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update partner" },
      { status: 500 }
    );
  }
}

/* ---------- DELETE /api/partners/:id (soft) ---------- */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;

    const deleted = await prisma.partners.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json({ message: "deleted", data: deleted });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`DELETE /api/partners/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete partner" },
      { status: 500 }
    );
  }
}


