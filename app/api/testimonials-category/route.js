// app/api/testimonial-categories/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

/* ================= Helpers ================= */
async function assertAdminOrNull() {
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

function trimOrNull(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function slugify(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  if (!baseSlug) return null;
  let slug = baseSlug;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.testimonial_categories.findFirst({
      where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
      select: { id: true },
    });
    if (!found) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

/* ================= GET (list) ================= */
export async function GET(req) {
  try {
    const locale = getLocaleFromReq(req);

    const cats = await prisma.testimonial_categories.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, slug: true },
    });

    if (!cats.length) return NextResponse.json({ data: [] });

    const ids = cats.map((c) => c.id);
    const tr = await prisma.testimonial_categories_translate.findMany({
      where: {
        category_id: { in: ids },
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
      select: { category_id: true, locale: true, name: true },
    });

    // pick best translation (prefer requested locale then fallback 'id')
    const pick = new Map();
    for (const t of tr) {
      const key = t.category_id;
      if (
        !pick.has(key) ||
        (pick.get(key).locale !== locale && t.locale === locale)
      ) {
        pick.set(key, t);
      }
    }

    const data = cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: pick.get(c.id)?.name ?? null,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/testimonial-categories error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================= POST (create) ================= */
export async function POST(req) {
  try {
    const admin = await assertAdminOrNull();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) || {};
    const rawSlug = trimOrNull(body.slug, 100) || slugify(body.name || "");
    if (!rawSlug) {
      return NextResponse.json(
        { message: "slug atau name wajib diisi" },
        { status: 400 }
      );
    }
    const slug = await ensureUniqueSlug(slugify(rawSlug));

    const inputLocale = (body.locale || "id").slice(0, 5).toLowerCase();
    const name = trimOrNull(body.name, 191); // opsional; kalau kosong, tetap buat kategori

    const cat = await prisma.testimonial_categories.create({
      data: { slug },
      select: { id: true, slug: true },
    });

    // jika ada name, buat translate untuk locale input & pasangannya
    if (name) {
      // tulis untuk inputLocale
      await prisma.testimonial_categories_translate.create({
        data: { category_id: cat.id, locale: inputLocale, name },
      });

      // auto translate ke EN atau ID (pasangan)
      const pairLocale = inputLocale === "en" ? "id" : "en";
      try {
        const namePair = await translate(name, inputLocale, pairLocale);
        await prisma.testimonial_categories_translate.create({
          data: {
            category_id: cat.id,
            locale: pairLocale,
            name: (namePair || name).slice(0, 191),
          },
        });
      } catch (err) {
        console.warn("Auto-translate category name failed:", err?.message);
        // fallback: skip, atau simpan copy
        await prisma.testimonial_categories_translate.create({
          data: {
            category_id: cat.id,
            locale: pairLocale,
            name,
          },
        });
      }
    }

    return NextResponse.json({ data: cat }, { status: 201 });
  } catch (e) {
    console.error("POST /api/testimonial-categories error:", e);
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "Slug sudah digunakan" },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
