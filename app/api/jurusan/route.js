// app/api/jurusan/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- utils -------------------- */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

function normalizeLocale(v, fallback = DEFAULT_LOCALE) {
  return (v || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
/** Accept NextAuth session OR x-admin-key header (for Postman) */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw new Response("Forbidden", { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, via: "session" };
}
/** Read JSON or multipart/x-www-form-urlencoded (tanpa file) */
async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue;
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/** -- NEW: date → timestamp (ms), with guard */
function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

/** map DB row → API shape (with created_ts/updated_ts) */
function mapJurusan(row, locale, fallback) {
  const t = pickTrans(row.jurusan_translate || [], locale, fallback);
  const created_ts = toTs(row.created_at) ?? toTs(row.updated_at) ?? null;
  const updated_ts = toTs(row.updated_at) ?? null;
  return {
    id: row.id,
    college_id: row.college_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    created_ts,
    updated_ts,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
  };
}

/* -------------------- GET (list) -------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const q = (searchParams.get("q") || "").trim();
    const college_id =
      (searchParams.get("college_id") || "").trim() || undefined;
    const sort = String(searchParams.get("sort") || "created_at:desc");
    const [sortField = "created_at", sortDir = "desc"] = sort.split(":");
    const allowed = new Set(["created_at", "updated_at", "name"]);
    const orderBy = allowed.has(sortField)
      ? [
          {
            [sortField]:
              sortField === "name"
                ? undefined
                : sortDir === "asc"
                ? "asc"
                : "desc",
          },
        ]
      : [{ created_at: "desc" }];

    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const baseDeleted = onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null };

    const where = {
      ...baseDeleted,
      ...(college_id ? { college_id } : {}),
      ...(q
        ? {
            jurusan_translate: {
              some: {
                locale: { in: locales },
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.jurusan.count({ where }),
      prisma.jurusan.findMany({
        where,
        orderBy: orderBy[0]?.name ? undefined : orderBy, // name-sort handled in memory
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          college_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          jurusan_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    let data = rows.map((r) => mapJurusan(r, locale, fallback));

    if (sortField === "name") {
      data.sort((a, b) => {
        const A = (a.name || "").toLowerCase();
        const B = (b.name || "").toLowerCase();
        return (sortDir === "asc" ? 1 : -1) * (A > B ? 1 : A < B ? -1 : 0);
      });
      data = data.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
    }

    return json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    console.error("GET /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to fetch jurusan list" },
      { status: 500 }
    );
  }
}

/* -------------------- POST (create) -------------------- */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const body = await readBody(req);

    const college_id = String(body?.college_id || "").trim();
    if (!college_id) return badRequest("college_id is required");

    const locale = normalizeLocale(body.locale);
    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name is required");

    const description =
      body.description !== undefined && body.description !== null
        ? String(body.description)
        : null;

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.jurusan.create({
        data: {
          college_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // primary translation
      await tx.jurusan_translate.upsert({
        where: { id_jurusan_locale: { id_jurusan: parent.id, locale } },
        update: { name, description },
        create: { id_jurusan: parent.id, locale, name, description },
      });

      // optional EN translation
      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.jurusan_translate.upsert({
          where: {
            id_jurusan_locale: { id_jurusan: parent.id, locale: EN_LOCALE },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_jurusan: parent.id,
            locale: EN_LOCALE,
            name: nameEn || name,
            description: descEn ?? description,
          },
        });
      }

      return parent;
    });

    return json({ data: { id: created.id } }, { status: 201 });
  } catch (err) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "college_id invalid (FK failed)" },
        { status: 400 }
      );
    }
    if (err instanceof Response) return err;
    console.error("POST /api/jurusan error:", err);
    return NextResponse.json(
      { message: "Failed to create jurusan" },
      { status: 500 }
    );
  }
}
