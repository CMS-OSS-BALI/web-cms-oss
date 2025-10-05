// app/api/testimonial-categories/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

/* ================= Helpers ================= */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
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

/* ================= GET (detail) ================= */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const locale = getLocaleFromReq(req);

    const cat = await prisma.testimonial_categories.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!cat)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const tr = await prisma.testimonial_categories_translate.findMany({
      where: {
        category_id: id,
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
      select: { locale: true, name: true },
    });

    const current =
      tr.find((t) => t.locale === locale) ||
      tr.find((t) => t.locale === "id") ||
      null;

    return NextResponse.json({
      data: {
        id: cat.id,
        slug: cat.slug,
        name: current?.name ?? null,
        locale: current?.locale ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/testimonial-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================= PUT (update) =================
Body opsional:
{
  "slug": "success-story",
  "name": "Success Story",   // untuk locale tertentu (default ?locale=id)
  "locale": "id"             // override kalau mau
}
— Jika 'name' diisi → akan auto-translate ke pasangan (id<->en)
================================================== */
export async function PUT(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const body = (await req.json().catch(() => ({}))) || {};
    const locale = (body.locale || getLocaleFromReq(req))
      .slice(0, 5)
      .toLowerCase();

    const exist = await prisma.testimonial_categories.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!exist) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const slugInput = trimOrNull(body.slug, 100);
    const name = trimOrNull(body.name, 191);

    // Update slug kalau ada
    if (slugInput) {
      const newSlug = await ensureUniqueSlug(slugify(slugInput), id);
      await prisma.testimonial_categories.update({
        where: { id },
        data: { slug: newSlug },
      });
    }

    // Update/insert translation kalau name diisi
    if (name) {
      // upsert untuk locale yang diminta
      await prisma.testimonial_categories_translate
        .upsert({
          where: {
            // unique perlu id; kita cari dulu
            // prisma tidak support composite in upsert where → pakai findFirst lalu update/create
            // tapi cara cepat:
            category_id_locale: undefined, // placeholder agar tidak error TS, block ini tidak dipakai
          },
          update: {},
          create: {},
        })
        .catch(() => {}); // abaikan; kita manual di bawah

      const existTr = await prisma.testimonial_categories_translate.findFirst({
        where: { category_id: id, locale },
        select: { id: true },
      });
      if (existTr) {
        await prisma.testimonial_categories_translate.update({
          where: { id: existTr.id },
          data: { name },
        });
      } else {
        await prisma.testimonial_categories_translate.create({
          data: { category_id: id, locale, name },
        });
      }

      // auto translate ke pasangan
      const pairLocale = locale === "en" ? "id" : "en";
      try {
        const namePair = await translate(name, locale, pairLocale);
        const existPair =
          await prisma.testimonial_categories_translate.findFirst({
            where: { category_id: id, locale: pairLocale },
            select: { id: true },
          });
        if (existPair) {
          await prisma.testimonial_categories_translate.update({
            where: { id: existPair.id },
            data: { name: (namePair || name).slice(0, 191) },
          });
        } else {
          await prisma.testimonial_categories_translate.create({
            data: {
              category_id: id,
              locale: pairLocale,
              name: (namePair || name).slice(0, 191),
            },
          });
        }
      } catch (err) {
        console.warn("Auto-translate category update failed:", err?.message);
      }
    }

    const latest = await prisma.testimonial_categories.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ data: latest });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (e?.code === "P2002")
      return NextResponse.json(
        { message: "Slug sudah digunakan" },
        { status: 409 }
      );

    console.error("PUT /api/testimonial-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================= DELETE (remove) ================= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;

    // Hapus kategori → relasi testimonials.category_id akan SetNull (sesuai schema)
    await prisma.testimonial_categories.delete({ where: { id } });

    return NextResponse.json({ data: { id } });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    console.error("DELETE /api/testimonial-categories/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
