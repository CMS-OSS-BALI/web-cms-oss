// app/api/mitra-dalam-negeri/export/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const FALLBACK_LOCALE = EN_LOCALE;

const isPg = (process.env.DATABASE_URL || "").startsWith("postgres");
const ci = (q) =>
  q
    ? isPg
      ? { contains: q, mode: "insensitive" }
      : { contains: q }
    : undefined;

function normalizeLocale(v, f = DEFAULT_LOCALE) {
  return (v || f).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function parseStatusFilter(s) {
  if (!s) return undefined;
  const ALLOWED = new Set(["PENDING", "APPROVED", "DECLINED"]);
  const arr = String(s)
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x) => ALLOWED.has(x));
  return arr.length ? arr : undefined;
}
function parseDateOnly(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(`${y}-${mo}-${d}T00:00:00.000Z`);
}
// Excel-safe: quote + escape + cegah formula injection.
function csvSafe(val, SEP) {
  let s = String(val ?? "");
  if (/^[=\-+@]/.test(s)) s = "'" + s;
  const needsQuote = s.includes(SEP) || s.includes('"') || /\r|\n/.test(s);
  return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
}

async function assertAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  return session.user;
}

export async function GET(req) {
  try {
    await assertAdmin(req);
    const { searchParams } = new URL(req.url);

    // ===== delimiter & EOL
    const SEP = (searchParams.get("sep") || ";").slice(0, 1) || ";";
    const EOL = "\r\n";
    const EXCEL_SEP_LINE = `sep=${SEP}${EOL}`;

    // ===== filters
    const q = (searchParams.get("q") || "").trim();
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const statusFilter = parseStatusFilter(searchParams.get("status"));
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || FALLBACK_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const category_id = searchParams.get("category_id");
    const category_slug = searchParams.get("category_slug");

    const dateFrom = parseDateOnly(searchParams.get("date_from"));
    const dateToRaw = parseDateOnly(searchParams.get("date_to"));
    const dateTo = dateToRaw
      ? new Date(dateToRaw.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : includeDeleted || withDeleted
        ? {}
        : { deleted_at: null }),
      mitra_translate: { some: { locale: { in: locales } } },
    };
    const AND = [];
    if (statusFilter) AND.push({ status: { in: statusFilter } });

    if (category_id) {
      AND.push({ category_id: String(category_id) });
    } else if (category_slug) {
      const cat = await prisma.mitra_categories.findUnique({
        where: { slug: String(category_slug) },
        select: { id: true },
      });
      AND.push({ category_id: cat?.id ?? "__nope__" });
    }

    if (q) {
      AND.push({
        OR: [
          {
            mitra_translate: {
              some: {
                locale: { in: locales },
                OR: [{ name: ci(q) }, { description: ci(q) }],
              },
            },
          },
          { email: ci(q) },
          { phone: ci(q) },
          { address: ci(q) },
          { city: ci(q) },
          { province: ci(q) },
          { postal_code: ci(q) },
          { instagram: ci(q) },
          { twitter: ci(q) },
          { website: ci(q) },
          { contact_name: ci(q) },
          { contact_position: ci(q) },
          { contact_whatsapp: ci(q) },
          { nik: ci(q) },
        ],
      });
    }
    if (dateFrom || dateTo) {
      AND.push({
        created_at: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lt: dateTo } : {}),
        },
      });
    }
    if (AND.length) where.AND = AND;

    const HEAD = [
      "id",
      "merchant_name",
      "status",
      "category",
      "email",
      "phone",
      "nik",
      "website",
      "city",
      "province",
      "created_at",
    ];
    const encoder = new TextEncoder();
    const BATCH = 1000;
    let cursorId = null;

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(EXCEL_SEP_LINE));
        controller.enqueue(encoder.encode(HEAD.join(SEP) + EOL));
      },
      async pull(controller) {
        const args = {
          where,
          include: {
            mitra_translate: {
              where: { locale: { in: locales } },
              select: { locale: true, name: true, description: true },
            },
            mitra_categories: {
              include: {
                mitra_categories_translate: {
                  where: { locale: { in: locales } },
                  select: { locale: true, name: true },
                },
              },
            },
          },
          orderBy: [{ id: "asc" }],
          take: BATCH,
        };
        if (cursorId) {
          args.cursor = { id: cursorId };
          args.skip = 1;
        }

        const rows = await prisma.mitra.findMany(args);
        if (!rows.length) {
          controller.close();
          return;
        }

        const chunk =
          rows
            .map((row) => {
              const t = pickTrans(row.mitra_translate || [], locale, fallback);
              const ct = pickTrans(
                row.mitra_categories?.mitra_categories_translate || [],
                locale,
                fallback
              );
              const cols = [
                row.id,
                csvSafe(t?.name || "", SEP),
                csvSafe(row.status || "", SEP),
                csvSafe(ct?.name || "", SEP),
                csvSafe(row.email || "", SEP),
                csvSafe(row.phone || "", SEP),
                csvSafe(row.nik || "", SEP),
                csvSafe(row.website || "", SEP),
                csvSafe(row.city || "", SEP),
                csvSafe(row.province || "", SEP),
                row.created_at ? new Date(row.created_at).toISOString() : "",
              ];
              return cols.join(SEP);
            })
            .join(EOL) + EOL;

        controller.enqueue(encoder.encode(chunk));
        cursorId = rows[rows.length - 1].id;
      },
      type: "bytes",
    });

    const fileName = `mitra_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("GET /api/mitra-dalam-negeri/export error:", err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
