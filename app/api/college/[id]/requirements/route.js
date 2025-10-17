// app/api/college/[id]/requirements/route.js
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
function asInt(v, dflt = null) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function mapItem(row, locale, fallback) {
  const t = pickTrans(row.translate || [], locale, fallback);
  return {
    id: row.id,
    college_id: row.college_id,
    prodi_id: row.prodi_id ?? null,
    sort: row.sort,
    created_at: row.created_at,
    updated_at: row.updated_at,
    locale_used: t?.locale || null,
    text: t?.text || null,
  };
}

/* -------------------- GET (list) -------------------- */
export async function GET(req, { params }) {
  try {
    const collegeId = params?.id;
    if (!collegeId) return badRequest("college id is required");

    const { searchParams } = new URL(req.url);
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];
    const prodi_id = (searchParams.get("prodi_id") || "").trim() || undefined;

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: { id: true },
    });
    if (!college)
      return NextResponse.json(
        { message: "College not found" },
        { status: 404 }
      );

    const rows = await prisma.college_requirement_item.findMany({
      where: { college_id: collegeId, ...(prodi_id ? { prodi_id } : {}) },
      orderBy: [{ sort: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        college_id: true,
        prodi_id: true,
        sort: true,
        created_at: true,
        updated_at: true,
        translate: {
          where: { locale: { in: locales } },
          select: { locale: true, text: true },
        },
      },
    });

    return json({ data: rows.map((r) => mapItem(r, locale, fallback)) });
  } catch (err) {
    console.error(`GET /api/college/${params?.id}/requirements error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch requirements" },
      { status: 500 }
    );
  }
}

/* -------------------- POST (create) -------------------- */
export async function POST(req, { params }) {
  try {
    await assertAdmin(req);
    const collegeId = params?.id;
    if (!collegeId) return badRequest("college id is required");

    const body = await readBody(req);
    const locale = normalizeLocale(body.locale);
    const text = String(body?.text || "").trim();
    if (!text) return badRequest("text is required");

    const prodi_id = body.prodi_id ? String(body.prodi_id).trim() : undefined;
    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: { id: true },
    });
    if (!college)
      return NextResponse.json(
        { message: "College not found" },
        { status: 404 }
      );

    if (prodi_id) {
      const prodi = await prisma.prodi.findUnique({
        where: { id: prodi_id },
        select: { id: true, college_id: true },
      });
      if (!prodi) return badRequest("prodi_id invalid");
      if (prodi.college_id && prodi.college_id !== collegeId) {
        return badRequest("prodi_id does not belong to this college");
      }
    }

    const sortFromBody = asInt(body.sort, null);

    const created = await prisma.$transaction(async (tx) => {
      let sort = sortFromBody;
      if (sort === null) {
        const agg = await tx.college_requirement_item.aggregate({
          where: { college_id: collegeId, ...(prodi_id ? { prodi_id } : {}) },
          _max: { sort: true },
        });
        sort = (agg._max?.sort ?? 0) + 1;
      }

      const itemId = randomUUID();
      const item = await tx.college_requirement_item.create({
        data: {
          id: itemId, // <- force UUID
          college_id: collegeId,
          prodi_id: prodi_id ?? null,
          sort,
        },
      });

      // primary translation
      await tx.college_requirement_item_translate.upsert({
        where: { item_id_locale: { item_id: item.id, locale } },
        update: { text },
        create: { id: randomUUID(), item_id: item.id, locale, text }, // <- force UUID
      });

      if (autoTranslate && locale !== EN_LOCALE) {
        const textEn = await translate(text, locale, EN_LOCALE).catch(
          () => null
        );
        await tx.college_requirement_item_translate.upsert({
          where: { item_id_locale: { item_id: item.id, locale: EN_LOCALE } },
          update: { text: textEn ?? text },
          create: {
            id: randomUUID(),
            item_id: item.id,
            locale: EN_LOCALE,
            text: textEn ?? text,
          }, // <- force UUID
        });
      }

      return item;
    });

    return json({ data: { id: created.id } }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(`POST /api/college/${params?.id}/requirements error:`, err);
    return NextResponse.json(
      { message: "Failed to create requirement" },
      { status: 500 }
    );
  }
}
