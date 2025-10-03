import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";

/* ===================== Helpers ===================== */
const MAX_NAME_LENGTH = 191;
const MAX_TEXT_LENGTH = 10000;

async function getAdminOrNull() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.admin_users.findUnique({ where: { email } });
}

function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
  }
}

function getLimitFromReq(req, fallback = 12) {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit"));
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.trunc(n) : fallback;
  } catch {
    return fallback;
  }
}

function trimOrNull(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function parseStar(input) {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 1 && i <= 5 ? i : null;
}

function normalizeYoutubeUrl(u) {
  if (u === undefined) return undefined; // khusus PUT
  const s = trimOrNull(u, 255);
  if (!s) return null;
  try {
    const url = new URL(s);
    if (!/^https?:/.test(url.protocol)) return null;
    return url.toString().slice(0, 255);
  } catch {
    return null;
  }
}

/* ===================== GET (list) ===================== */
export async function GET(req) {
  try {
    const locale = getLocaleFromReq(req);
    const limit = getLimitFromReq(req, 12);

    const rows = await prisma.testimonials.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        kampus_negara_tujuan: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!rows.length) return NextResponse.json({ data: [] });

    const ids = rows.map((r) => r.id);
    const translations = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: { in: ids },
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });

    // Pilih terjemahan paling cocok (locale target > id)
    const pick = new Map();
    for (const tr of translations) {
      const key = tr.id_testimonials;
      if (
        !pick.has(key) ||
        (pick.get(key).locale !== locale && tr.locale === locale)
      ) {
        pick.set(key, tr);
      }
    }

    const data = rows.map((r) => {
      const t = pick.get(r.id);
      return {
        id: r.id,
        photo_url: r.photo_url,
        star: r.star ?? null,
        youtube_url: r.youtube_url ?? null,
        kampus_negara_tujuan: r.kampus_negara_tujuan ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        name: t?.name ?? null,
        message: t?.message ?? null,
        locale: t?.locale ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ===================== POST (create) ===================== */
export async function POST(req) {
  try {
    const admin = await getAdminOrNull();
    if (!admin)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    const items = Array.isArray(raw) ? raw : [raw];

    // Validasi awal untuk semua item
    for (let i = 0; i < items.length; i++) {
      const body = items[i] ?? {};
      const photo_url = trimOrNull(body.photo_url, 255);
      const name = trimOrNull(body.name, MAX_NAME_LENGTH) || "";
      const message = trimOrNull(body.message, MAX_TEXT_LENGTH) || "";
      if (!photo_url || !name || !message) {
        return NextResponse.json(
          {
            message: `photo_url, name, dan message wajib diisi (item index ${i})`,
          },
          { status: 400 }
        );
      }
      if (body.star !== undefined && parseStar(body.star) === null) {
        return NextResponse.json(
          { message: `star harus integer 1–5 (item index ${i})` },
          { status: 422 }
        );
      }
    }

    const results = [];

    for (const body of items) {
      const locale = (body.locale || "id").slice(0, 5).toLowerCase();

      const photo_url = trimOrNull(body.photo_url, 255);
      const name = trimOrNull(body.name, MAX_NAME_LENGTH) || "";
      const message = trimOrNull(body.message, MAX_TEXT_LENGTH) || "";
      const youtube_url = normalizeYoutubeUrl(body.youtube_url);
      const kampus_negara_tujuan = trimOrNull(
        body.kampus_negara_tujuan ?? body.campusCountry,
        255
      );
      const star = parseStar(body.star);

      const id = randomUUID();

      await prisma.testimonials.create({
        data: {
          id,
          admin_user_id: admin.id,
          photo_url,
          star,
          youtube_url,
          kampus_negara_tujuan: kampus_negara_tujuan ?? null,
        },
      });

      await prisma.testimonials_translate.create({
        data: { id_testimonials: id, locale, name, message },
      });

      if (locale !== "en") {
        const [nameEn, messageEn] = await Promise.all([
          translate(name, locale || "id", "en"),
          translate(message, locale || "id", "en"),
        ]);
        await prisma.testimonials_translate.create({
          data: {
            id_testimonials: id,
            locale: "en",
            name: (nameEn || name).slice(0, MAX_NAME_LENGTH),
            message: messageEn || message,
          },
        });
      }

      results.push({
        id,
        photo_url,
        star: star ?? null,
        youtube_url: youtube_url ?? null,
        kampus_negara_tujuan: kampus_negara_tujuan ?? null,
        locale,
        name,
        message,
      });
    }

    const payload = Array.isArray(raw) ? results : results[0];
    return NextResponse.json({ data: payload }, { status: 201 });
  } catch (e) {
    console.error("POST /api/testimonials error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
