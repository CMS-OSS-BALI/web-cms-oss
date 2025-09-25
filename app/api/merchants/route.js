import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const FALLBACK_LOCALE = EN_LOCALE;

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) throw new Error("UNAUTHORIZED");
  return session.user;
}
function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(trans = [], primary = DEFAULT_LOCALE, fallback = DEFAULT_LOCALE) {
  const by = (loc) => trans.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ---------- GET /api/merchants ---------- */
export async function GET(req) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "10", 10)));
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || FALLBACK_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = includeDeleted ? {} : { deleted_at: null };
    const and = [];
    if (q) {
      and.push({
        OR: [
          {
            mitra_dalam_negeri_translate: {
              some: {
                locale: { in: locales },
                name: { contains: q, mode: "insensitive" },
              },
            },
          },
          {
            mitra_dalam_negeri_translate: {
              some: {
                locale: { in: locales },
                description: { contains: q, mode: "insensitive" },
              },
            },
          },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
          { instagram: { contains: q, mode: "insensitive" } },
          { twitter: { contains: q, mode: "insensitive" } },
          { website: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;
    where.mitra_dalam_negeri_translate = { some: { locale: { in: locales } } };

    const [total, rows] = await Promise.all([
      prisma.mitra_dalam_negeri.count({ where }),
      prisma.mitra_dalam_negeri.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          admin_user_id: true,
          address: true,
          email: true,
          phone: true,
          instagram: true,
          twitter: true,
          website: true,
          mou_url: true,
          image_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          mitra_dalam_negeri_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const translation = pickTrans(row.mitra_dalam_negeri_translate || [], locale, fallback);
      return {
        id: row.id,
        admin_user_id: row.admin_user_id,
        address: row.address,
        email: row.email,
        phone: row.phone,
        instagram: row.instagram,
        twitter: row.twitter,
        website: row.website,
        mou_url: row.mou_url,
        image_url: row.image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        locale_used: translation?.locale || null,
        merchant_name: translation?.name || null,
        about: translation?.description || null,
      };
    });

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/merchants error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await assertAdmin();
    const body = await req.json().catch(() => ({}));

    const locale = normalizeLocale(body.locale);
    const merchantName = (body?.merchant_name || "").trim();
    if (!merchantName) {
      return NextResponse.json(
        { message: "merchant_name wajib diisi" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const merchant = await tx.mitra_dalam_negeri.create({
        data: {
          admin_user_id: admin.id,
          address: String(body.address || ""),
          email: String(body.email || ""),
          phone: String(body.phone || ""),
          instagram: body.instagram ? String(body.instagram).trim() : null,
          twitter: body.twitter ? String(body.twitter).trim() : null,
          website: body.website ? String(body.website).trim() : null,
          mou_url: body.mou_url ? String(body.mou_url).trim() : null,
          image_url: body.image_url ? String(body.image_url).trim() : null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const about = body.about !== undefined && body.about !== null ? String(body.about) : null;

      await tx.mitra_dalam_negeri_translate.create({
        data: {
          id_merchants: merchant.id,
          locale,
          name: merchantName,
          description: about,
        },
      });

      if (locale !== EN_LOCALE && (merchantName || about)) {
        const [nameEn, aboutEn] = await Promise.all([
          merchantName ? translate(merchantName, locale, EN_LOCALE) : Promise.resolve(merchantName),
          about ? translate(about, locale, EN_LOCALE) : Promise.resolve(about),
        ]);

        await tx.mitra_dalam_negeri_translate.upsert({
          where: { id_merchants_locale: { id_merchants: merchant.id, locale: EN_LOCALE } },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(aboutEn !== undefined ? { description: aboutEn ?? null } : {}),
          },
          create: {
            id_merchants: merchant.id,
            locale: EN_LOCALE,
            name: nameEn || merchantName,
            description: aboutEn ?? about,
          },
        });
      }

      return merchant;
    });

    return NextResponse.json({ id: result.id, locale, merchant_name: merchantName }, { status: 201 });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/merchants error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

