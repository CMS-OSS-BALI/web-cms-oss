// app/api/prodi/[id]/route.js
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
      if (v instanceof File) continue;
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}
function mapProdi(row, locale, fallback) {
  const t = pickTrans(row.prodi_translate || [], locale, fallback);
  return {
    id: row.id,
    jurusan_id: row.jurusan_id,
    college_id: row.college_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    locale_used: t?.locale || null,
    name: t?.name || null,
    description: t?.description || null,
  };
}

/* -------------------- GET (detail) -------------------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const url = new URL(req.url);
    const locale = normalizeLocale(url.searchParams.get("locale"));
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const row = await prisma.prodi.findFirst({
      where: { id, deleted_at: null },
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
    if (!row) return notFound();
    return json({ data: mapProdi(row, locale, fallback) });
  } catch (err) {
    console.error(`GET /api/prodi/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch prodi" },
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
    const id = params?.id;
    if (!id) return badRequest("id is required");

    const body = await readBody(req);
    const locale = normalizeLocale(body.locale);

    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasDesc = Object.prototype.hasOwnProperty.call(body, "description");
    const name = hasName ? String(body.name || "").trim() : undefined;
    const description = hasDesc
      ? body.description !== null
        ? String(body.description)
        : null
      : undefined;
    const autoTranslate =
      String(body.autoTranslate ?? "true").toLowerCase() !== "false";

    await prisma.$transaction(async (tx) => {
      // If jurusan_id changes, also re-derive college_id
      if (body.jurusan_id !== undefined) {
        const newJurId = String(body.jurusan_id || "").trim();
        if (!newJurId)
          throw new Response("jurusan_id cannot be empty", { status: 400 });
        const jur = await tx.jurusan.findUnique({
          where: { id: newJurId },
          select: { id: true, college_id: true },
        });
        if (!jur)
          throw new Response("jurusan_id invalid (not found)", { status: 400 });

        await tx.prodi.update({
          where: { id },
          data: {
            jurusan_id: newJurId,
            college_id: jur.college_id ?? null,
            updated_at: new Date(),
          },
        });
      } else {
        // touch row if no parent change but ensure it exists
        const exists = await tx.prodi.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) throw new Response("Not found", { status: 404 });
      }

      // Upsert translation if provided
      if (hasName || hasDesc) {
        await tx.prodi_translate.upsert({
          where: { id_prodi_locale: { id_prodi: id, locale } },
          update: {
            ...(hasName ? { name } : {}),
            ...(hasDesc ? { description } : {}),
          },
          create: {
            id_prodi: id,
            locale,
            name: hasName ? name : "(no title)",
            description: hasDesc ? description : null,
          },
        });

        if (autoTranslate && locale !== EN_LOCALE) {
          const [nameEn, descEn] = await Promise.all([
            hasName && name
              ? translate(name, locale, EN_LOCALE)
              : Promise.resolve(undefined),
            hasDesc && typeof description === "string"
              ? translate(description, locale, EN_LOCALE)
              : Promise.resolve(undefined),
          ]);

          await tx.prodi_translate.upsert({
            where: { id_prodi_locale: { id_prodi: id, locale: EN_LOCALE } },
            update: {
              ...(nameEn !== undefined ? { name: nameEn } : {}),
              ...(descEn !== undefined ? { description: descEn ?? null } : {}),
            },
            create: {
              id_prodi: id,
              locale: EN_LOCALE,
              name: nameEn ?? (hasName ? name : "(no title)"),
              description: descEn ?? (hasDesc ? description : null),
            },
          });
        }
      }
    });

    return json({ data: { id } });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "jurusan_id invalid (FK failed)" },
        { status: 400 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/prodi/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update prodi" },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE (soft delete) -------------------- */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin(_req);
    const id = params?.id;
    if (!id) return badRequest("id is required");

    const deleted = await prisma.prodi.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({ data: deleted });
  } catch (err) {
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/prodi/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete prodi" },
      { status: 500 }
    );
  }
}
