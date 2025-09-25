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

function parseStar(input) {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 1 || i > 5) return null;
  return i;
}

function normalizeYoutubeUrl(u) {
  if (!u || typeof u !== "string") return null;
  const s = u.trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (!url.protocol.startsWith("http")) return null;
    return url.toString().slice(0, 255);
  } catch {
    return null;
  }
}

// PUBLIC: list testimonials (ikut locale, fallback 'id')
export async function GET(req) {
  try {
    const locale = pickLocaleParam(req);

    const rows = await prisma.testimonials.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!rows.length) return NextResponse.json({ data: [] });

    const ids = rows.map((r) => r.id);

    // ambil translate utk locale target + fallback id
    const trans = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: { in: ids },
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });

    // pilih yang paling sesuai (locale target > id)
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
        star: r.star ?? null,
        youtube_url: r.youtube_url ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        name: t?.name || null,
        message: t?.message || null,
        locale: t?.locale || null,
      };
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ADMIN: create testimonial + translate (ikut kolom star & youtube_url)
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

    const star = parseStar(body.star);
    const youtube_url = normalizeYoutubeUrl(body.youtube_url);

    if (!photo_url || !name || !message) {
      return NextResponse.json(
        { message: "photo_url, name, dan message wajib diisi" },
        { status: 400 }
      );
    }
    if (body.star !== undefined && star === null) {
      return NextResponse.json(
        { message: "star harus integer 1–5" },
        { status: 422 }
      );
    }

    const id = randomUUID();

    await prisma.testimonials.create({
      data: {
        id,
        admin_user_id: admin.id,
        photo_url,
        star,
        youtube_url,
      },
    });

    await prisma.testimonials_translate.create({
      data: {
        id_testimonials: id,
        locale,
        name,
        message,
      },
    });

    if (locale !== "en") {
      const source = locale || "id";
      const [nameEn, messageEn] = await Promise.all([
        translate(name, source, "en"),
        translate(message, source, "en"),
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
      {
        id,
        photo_url,
        star: star ?? null,
        youtube_url: youtube_url ?? null,
        locale,
        name,
        message,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
