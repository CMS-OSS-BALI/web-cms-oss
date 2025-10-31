// app/api/prodi/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------- utils -------------------- */
const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

// --- NEW: safe date → timestamp (ms)
function toTs(v) {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return Number.isFinite(t) ? t : null;
}

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

/** Read form-data or JSON body (ignore Files) */
async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (typeof File !== "undefined" && v instanceof File) continue;
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/** map DB row → API shape (with created_ts/updated_ts) */
function mapProdi(row, locale, fallback) {
  const t = pickTrans(row.prodi_translate || [], locale, fallback);
  const created_ts = toTs(row.created_at) ?? toTs(row.updated_at) ?? null;
  const updated_ts = toTs(row.updated_at) ?? null;
  return {
    id: row.id,
    jurusan_id: row.jurusan_id,
    college_id: row.college_id ?? null,
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
    const jurusan_id =
      (searchParams.get("jurusan_id") || "").trim() || undefined;
    const sort = String(searchParams.get("sort") || "created_at:desc");
    const [sortFieldRaw = "created_at", sortDirRaw = "desc"] = sort.split(":");
    const sortField = sortFieldRaw.toLowerCase();
    const sortDir = sortDirRaw.toLowerCase() === "asc" ? "asc" : "desc";

    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const deletedFilter = onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null };

    // ⬇️ FIX: Hapus `mode: 'insensitive'` (tidak didukung di MySQL Prisma).
    // Jika kolom Anda memakai collation *_ci (case-insensitive), `contains` sudah tidak peka huruf besar/kecil.
    const where = {
      ...deletedFilter,
      ...(jurusan_id ? { jurusan_id } : {}),
      ...(q
        ? {
            prodi_translate: {
              some: {
                locale: { in: locales },
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    // Sort by name → ambil semua lalu sort in-memory (agar pakai terjemahan yg dipilih)
    if (sortField === "name") {
      const rowsAll = await prisma.prodi.findMany({
        where,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          jurusan_id: true,
          college_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          prodi_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      });

      let dataAll = rowsAll.map((r) => mapProdi(r, locale, fallback));
      dataAll.sort((a, b) => {
        const A = (a.name || "").toLowerCase();
        const B = (b.name || "").toLowerCase();
        if (A === B) return 0;
        const comp = A > B ? 1 : -1;
        return sortDir === "asc" ? comp : -comp;
      });

      const total = dataAll.length;
      const start = (page - 1) * perPage;
      const data = dataAll.slice(start, start + perPage);
      return json({
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        data,
      });
    }

    // Sort by created_at / updated_at (DB-side)
    const [total, rows] = await Promise.all([
      prisma.prodi.count({ where }),
      prisma.prodi.findMany({
        where,
        orderBy:
          sortField === "updated_at"
            ? [{ updated_at: sortDir }]
            : [{ created_at: sortDir }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          jurusan_id: true,
          college_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          prodi_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((r) => mapProdi(r, locale, fallback));
    return json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    console.error("GET /api/prodi error:", err);
    return NextResponse.json(
      { message: "Failed to fetch prodi list" },
      { status: 500 }
    );
  }
}

/* -------------------- POST (create) -------------------- */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const body = await readBody(req);

    const jurusan_id = String(body?.jurusan_id || "").trim();
    if (!jurusan_id) return badRequest("jurusan_id is required");

    const locale = normalizeLocale(body.locale);
    const name = String(body?.name || "").trim();
    if (!name) return badRequest("name is required");

    const description =
      body.description !== undefined && body.description !== null
        ? String(body.description)
        : null;

    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";
    const id = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      // derive college_id from jurusan
      const jur = await tx.jurusan.findUnique({
        where: { id: jurusan_id },
        select: { id: true, college_id: true },
      });
      if (!jur)
        throw new Response("jurusan_id invalid (not found)", { status: 400 });

      const parent = await tx.prodi.create({
        data: {
          id,
          jurusan_id,
          college_id: jur.college_id ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // primary translation
      await tx.prodi_translate.upsert({
        where: { id_prodi_locale: { id_prodi: parent.id, locale } },
        update: { name, description },
        create: { id_prodi: parent.id, locale, name, description },
      });

      // optional EN translation
      if (autoTranslate && locale !== EN_LOCALE && (name || description)) {
        const [nameEn, descEn] = await Promise.all([
          name ? translate(name, locale, EN_LOCALE) : Promise.resolve(name),
          description
            ? translate(description, locale, EN_LOCALE)
            : Promise.resolve(description),
        ]);

        await tx.prodi_translate.upsert({
          where: {
            id_prodi_locale: { id_prodi: parent.id, locale: EN_LOCALE },
          },
          update: {
            ...(nameEn ? { name: nameEn } : {}),
            ...(descEn !== undefined ? { description: descEn ?? null } : {}),
          },
          create: {
            id_prodi: parent.id,
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
    if (err instanceof Response) return err;
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "jurusan_id invalid (FK failed)" },
        { status: 400 }
      );
    }
    console.error("POST /api/prodi error:", err);
    return NextResponse.json(
      { message: "Failed to create prodi" },
      { status: 500 }
    );
  }
}
