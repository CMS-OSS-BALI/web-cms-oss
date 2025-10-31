// app/api/admin/bookings/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* ===== utils ===== */
function sanitize(v) {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(d, i) {
  return NextResponse.json(sanitize(d), i);
}
function toInt(v, d = null) {
  if (v === "" || v == null || v === undefined) return d;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : d;
}

function pickName(translates = [], locale = "id", fallback = "en") {
  const byLocale =
    translates.find((t) => t.locale?.toLowerCase() === locale.toLowerCase()) ||
    translates.find(
      (t) => t.locale?.toLowerCase() === fallback.toLowerCase()
    ) ||
    translates[0];
  return byLocale?.name || "";
}

async function assertAdmin(req) {
  // dev/test via header
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const any = await prisma.admin_users.findFirst({ select: { id: true } });
    if (!any) throw new Response("Forbidden", { status: 403 });
    return true;
  }
  // real admin via session
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return true;
}

/* ===== GET /api/admin/bookings
   Query:
   - page, perPage
   - q                 (rep_name/campus_name/event.location/category name via translate)
   - voucher           ("voucher" | "non" | "all")
   - category          (id | slug | translated name)
   - locale, fallback  (optional; defaults id/en)
=================================== */
export async function GET(req) {
  try {
    await assertAdmin(req);

    const url = new URL(req.url);
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, toInt(url.searchParams.get("perPage"), 10) || 10)
    );
    const q = (url.searchParams.get("q") || "").trim();
    const voucher = (url.searchParams.get("voucher") || "all").trim(); // voucher | non | all
    const categoryParam = (url.searchParams.get("category") || "").trim();
    const locale = (url.searchParams.get("locale") || "id").trim();
    const fallback = (url.searchParams.get("fallback") || "en").trim();

    // where builder
    const AND = [];
    if (voucher === "voucher") {
      AND.push({ NOT: [{ voucher_code: null }, { voucher_code: "" }] });
    } else if (voucher === "non") {
      AND.push({ OR: [{ voucher_code: null }, { voucher_code: "" }] });
    }

    // category filter: support id, slug, or translated name (all strings)
    if (categoryParam) {
      AND.push({
        event: {
          category: {
            OR: [
              { id: categoryParam },
              { slug: { equals: categoryParam, mode: "insensitive" } },
              {
                translate: {
                  some: {
                    locale: { in: [locale, fallback] },
                    name: { equals: categoryParam, mode: "insensitive" },
                  },
                },
              },
            ],
          },
        },
      });
    }

    const OR = [];
    if (q) {
      OR.push(
        { rep_name: { contains: q, mode: "insensitive" } },
        { campus_name: { contains: q, mode: "insensitive" } },
        { event: { location: { contains: q, mode: "insensitive" } } },
        {
          event: {
            category: {
              translate: {
                some: {
                  locale: { in: [locale, fallback] },
                  name: { contains: q, mode: "insensitive" },
                },
              },
            },
          },
        }
      );
    }

    const where = {};
    if (AND.length) where.AND = AND;
    if (OR.length) where.OR = OR;

    // Build categories list for dropdown:
    // ambil distinct category_id yang dipakai event, lalu hydrate + lokalize nama
    const catsPromise = (async () => {
      const groups = await prisma.events.groupBy({
        by: ["category_id"],
        where: { category_id: { not: null } },
      });
      const ids = groups.map((g) => g.category_id).filter(Boolean);
      if (!ids.length) return [];
      const base = await prisma.event_categories.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          slug: true,
          translate: {
            where: { locale: { in: [locale, fallback] } },
            select: { locale: true, name: true },
          },
        },
        orderBy: { slug: "asc" }, // tidak bisa orderBy nama terjemahan langsung
      });
      return base.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: pickName(c.translate, locale, fallback),
      }));
    })();

    const [total, rows, categories] = await Promise.all([
      prisma.event_booth_bookings.count({ where }),
      prisma.event_booth_bookings.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          rep_name: true,
          campus_name: true,
          voucher_code: true,
          order_id: true,
          status: true,
          created_at: true,
          event: {
            select: {
              location: true,
              category: {
                select: {
                  id: true,
                  slug: true,
                  translate: {
                    where: { locale: { in: [locale, fallback] } },
                    select: { locale: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
      catsPromise,
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      rep_name: r.rep_name,
      campus_name: r.campus_name,
      voucher_code: r.voucher_code,
      order_id: r.order_id,
      status: r.status,
      created_at: r.created_at,
      event_title: r.event?.location || "",
      event_category: pickName(
        r.event?.category?.translate || [],
        locale,
        fallback
      ),
      event_category_slug: r.event?.category?.slug || "",
      event_category_id: r.event?.category?.id ?? null,
    }));

    return json({
      message: "OK",
      data,
      categories, // [{ id, slug, name }]
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    console.error("GET /api/admin/bookings error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat bookings." } },
      { status: 500 }
    );
  }
}
