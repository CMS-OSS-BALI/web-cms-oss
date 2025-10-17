// app/api/college/[id]/requirements/[reqId]/route.js
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
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
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

/* -------------------- GET (detail) -------------------- */
export async function GET(req, { params }) {
  try {
    const collegeId = params?.id;
    const reqId = params?.reqId;
    if (!collegeId || !reqId) return badRequest("ids are required");

    const url = new URL(req.url);
    const locale = normalizeLocale(url.searchParams.get("locale"));
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.college_requirement_item.findFirst({
      where: { id: reqId, college_id: collegeId },
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
    if (!row) return notFound();

    return json({ data: mapItem(row, locale, fallback) });
  } catch (err) {
    console.error(
      `GET /api/college/${params?.id}/requirements/${params?.reqId} error:`,
      err
    );
    return NextResponse.json(
      { message: "Failed to fetch requirement" },
      { status: 500 }
    );
  }
}

/* -------------------- PUT/PATCH (update) -------------------- */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}
export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const collegeId = params?.id;
    const reqId = params?.reqId;
    if (!collegeId || !reqId) return badRequest("ids are required");

    const body = await readBody(req);
    const locale = normalizeLocale(body.locale);

    const exists = await prisma.college_requirement_item.findFirst({
      where: { id: reqId, college_id: collegeId },
      select: { id: true },
    });
    if (!exists) return notFound();

    const ops = [];

    // parent
    const parent = {};
    if (body.prodi_id !== undefined) {
      const p = String(body.prodi_id || "").trim();
      if (!p) parent.prodi_id = null;
      else {
        const prodi = await prisma.prodi.findUnique({
          where: { id: p },
          select: { id: true, college_id: true },
        });
        if (!prodi) return badRequest("prodi_id invalid");
        if (prodi.college_id && prodi.college_id !== collegeId) {
          return badRequest("prodi_id does not belong to this college");
        }
        parent.prodi_id = p;
      }
    }
    if (body.sort !== undefined) {
      const s = asInt(body.sort, null);
      if (s === null) return badRequest("sort must be integer");
      parent.sort = s;
    }
    if (Object.keys(parent).length) {
      parent.updated_at = new Date();
      ops.push(
        prisma.college_requirement_item.update({
          where: { id: reqId },
          data: parent,
        })
      );
    }

    // translation
    const hasText = Object.prototype.hasOwnProperty.call(body, "text");
    const text = hasText
      ? body.text !== null
        ? String(body.text)
        : null
      : undefined;
    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    if (hasText) {
      ops.push(
        prisma.college_requirement_item_translate.upsert({
          where: { item_id_locale: { item_id: reqId, locale } },
          update: { text },
          create: {
            id: randomUUID(),
            item_id: reqId,
            locale,
            text: text ?? "",
          }, // <- force UUID
        })
      );

      if (autoTranslate && locale !== EN_LOCALE) {
        const textEn =
          typeof text === "string" && text.length
            ? await translate(text, locale, EN_LOCALE).catch(() => undefined)
            : undefined;

        ops.push(
          prisma.college_requirement_item_translate.upsert({
            where: { item_id_locale: { item_id: reqId, locale: EN_LOCALE } },
            update: { ...(textEn !== undefined ? { text: textEn } : {}) },
            create: {
              id: randomUUID(),
              item_id: reqId,
              locale: EN_LOCALE,
              text: textEn ?? text ?? "",
            }, // <- force UUID
          })
        );
      }
    }

    if (ops.length) await prisma.$transaction(ops);
    return json({ data: { id: reqId } });
  } catch (err) {
    console.error(
      `PATCH /api/college/${params?.id}/requirements/${params?.reqId} error:`,
      err
    );
    return NextResponse.json(
      { message: "Failed to update requirement" },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE -------------------- */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const collegeId = params?.id;
    const reqId = params?.reqId;
    if (!collegeId || !reqId) return badRequest("ids are required");

    const item = await prisma.college_requirement_item.findFirst({
      where: { id: reqId, college_id: collegeId },
      select: { id: true },
    });
    if (!item) return notFound();

    await prisma.college_requirement_item.delete({ where: { id: reqId } });
    return json({ data: { id: reqId, deleted: true } });
  } catch (err) {
    console.error(
      `DELETE /api/college/${params?.id}/requirements/${params?.reqId} error:`,
      err
    );
    return NextResponse.json(
      { message: "Failed to delete requirement" },
      { status: 500 }
    );
  }
}
