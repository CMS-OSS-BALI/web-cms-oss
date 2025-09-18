import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";

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

function buildUpdateData(payload) {
  const allow = [
    "address",
    "email",
    "phone",
    "instagram",
    "twitter",
    "website",
    "mou_url",
    "image_url",
  ];
  const data = {};
  for (const key of allow) {
    if (payload[key] !== undefined) {
      const value = payload[key];
      data[key] = value === null ? null : String(value);
    }
  }
  return data;
}

export async function GET(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "id kosong" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(searchParams.get("fallback") || EN_LOCALE);
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const merchant = await prisma.merchants.findFirst({
      where: { id },
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
        merchants_translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!merchant) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const translation = pickTrans(merchant.merchants_translate || [], locale, fallback);
    const { merchants_translate: _translations, ...base } = merchant;

    return NextResponse.json({
      ...base,
      merchant_name: translation?.name || null,
      about: translation?.description || null,
      locale_used: translation?.locale || null,
    });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`GET /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    const payload = await req.json().catch(() => ({}));
    const data = buildUpdateData(payload);
    const locale = normalizeLocale(payload.locale);

    if (!id) {
      return NextResponse.json({ message: "id kosong" }, { status: 400 });
    }

    const hasName = payload.merchant_name !== undefined;
    const hasAbout = payload.about !== undefined;
    if (hasName) {
      const trimmed = String(payload.merchant_name || "").trim();
      if (!trimmed) {
        return NextResponse.json({ message: "merchant_name wajib diisi" }, { status: 400 });
      }
      payload.merchant_name = trimmed;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) {
        await tx.merchants.update({ where: { id }, data });
      }

      if (hasName || hasAbout) {
        const translationUpdate = {};
        if (hasName) translationUpdate.name = payload.merchant_name;
        if (hasAbout) {
          translationUpdate.description =
            payload.about === null ? null : String(payload.about);
        }

        await tx.merchants_translate.upsert({
          where: { id_merchants_locale: { id_merchants: id, locale } },
          update: translationUpdate,
          create: {
            id_merchants: id,
            locale,
            name: translationUpdate.name || payload.merchant_name || "",
            description:
              translationUpdate.description !== undefined
                ? translationUpdate.description
                : null,
          },
        });

        if (locale !== EN_LOCALE && (hasName || hasAbout)) {
          const sourceName = hasName ? payload.merchant_name : undefined;
          const sourceAbout = hasAbout ? translationUpdate.description : undefined;

          const [nameEn, aboutEn] = await Promise.all([
            sourceName
              ? translate(sourceName, locale, EN_LOCALE)
              : Promise.resolve(undefined),
            typeof sourceAbout === "string"
              ? translate(sourceAbout, locale, EN_LOCALE)
              : Promise.resolve(sourceAbout),
          ]);

          const enUpdate = {};
          if (sourceName !== undefined) enUpdate.name = nameEn || sourceName;
          if (sourceAbout !== undefined) enUpdate.description = aboutEn ?? sourceAbout ?? null;

          if (Object.keys(enUpdate).length) {
            await tx.merchants_translate.upsert({
              where: { id_merchants_locale: { id_merchants: id, locale: EN_LOCALE } },
              update: enUpdate,
              create: {
                id_merchants: id,
                locale: EN_LOCALE,
                name: enUpdate.name || payload.merchant_name,
                description:
                  enUpdate.description !== undefined
                    ? enUpdate.description
                    : sourceAbout ?? null,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ data: { id } });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`PATCH /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";
    const restore = searchParams.get("restore") === "1";

    if (hard && restore) {
      return NextResponse.json(
        { message: "Gunakan salah satu: hard=1 atau restore=1" },
        { status: 400 }
      );
    }

    if (restore) {
      const restored = await prisma.merchants.update({
        where: { id },
        data: { deleted_at: null },
      });
      return NextResponse.json(restored);
    }

    if (hard) {
      await prisma.merchants.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const deleted = await prisma.merchants.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return NextResponse.json(deleted);
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`DELETE /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
