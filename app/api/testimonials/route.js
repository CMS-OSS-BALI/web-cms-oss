import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";

async function getAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  return admin || null;
}

function pickLocaleParam(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5);
  } catch {
    return "id";
  }
}

// PUBLIC: list testimonials (ambil terjemahan sesuai locale, fallback 'id')
export async function GET(req) {
  const locale = pickLocaleParam(req);

  const rows = await prisma.testimonials.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
  });

  if (!rows.length) return NextResponse.json({ data: [] });

  const ids = rows.map((r) => r.id);

  // ambil translate utk locale yang diminta + fallback 'id'
  const trans = await prisma.testimonials_translate.findMany({
    where: {
      id_testimonials: { in: ids },
      locale: locale === "id" ? "id" : { in: [locale, "id"] },
    },
  });

  // pilih terbaik: locale diminta > 'id'
  const best = new Map();
  for (const tr of trans) {
    const key = tr.id_testimonials;
    if (
      !best.has(key) ||
      (best.get(key).locale !== locale && tr.locale === locale)
    ) {
      best.set(key, tr);
    }
  }

  const data = rows.map((r) => {
    const t = best.get(r.id);
    return {
      id: r.id,
      photo_url: r.photo_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      // terjemahan terpilih (mungkin null jika belum ada)
      name: t?.name || null,
      message: t?.message || null,
      locale: t?.locale || null,
    };
  });

  return NextResponse.json({ data });
}

// ADMIN: create testimonial + translate
export async function POST(req) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const locale = (body.locale || "id").slice(0, 5).toLowerCase();
    const photo_url = (body.photo_url || "").trim();
    const name = (body.name || "").trim();
    const message = (body.message || "").trim();

    if (!photo_url || !name || !message) {
      return NextResponse.json(
        { message: "photo_url, name, dan message wajib diisi" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    // buat induk
    await prisma.testimonials.create({
      data: {
        id,
        admin_user_id: admin.id,
        photo_url,
      },
    });

    // buat translate pertama
    await prisma.testimonials_translate.create({
      data: {
        id_testimonials: id,
        locale,
        name,
        message,
      },
    });

    if (locale !== "en") {
      const sourceLocale = (locale || "id").toLowerCase();
      const [nameEn, messageEn] = await Promise.all([
        translate(name, sourceLocale, "en"),
        translate(message, sourceLocale, "en"),
      ]);

      await prisma.testimonials_translate.create({
        data: {
          id_testimonials: id,
          locale: "en",
          name: nameEn || name,
          message: messageEn || message,
        },
      });
    }

    return NextResponse.json(
      { id, photo_url, locale, name, message },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /testimonials error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
