// app/api/consultants/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===== Helpers ===== */
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
function json(body, init) {
  return NextResponse.json(sanitize(body), init);
}
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}
function handleAuthError(err) {
  const status = err?.status === 401 ? 401 : 403;
  return json(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status }
  );
}
function parseId(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ===== GET /api/consultants/:id (DETAIL) =====
Query: locale, fallback
*/
export async function GET(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const locale = pickLocale(req, "locale", "id");
  const fallback = pickLocale(req, "fallback", "id");

  const row = await prisma.consultants.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      whatsapp: true,
      profile_image_url: true,
      program_consultant_image_url: true,
      created_at: true,
      updated_at: true,
      consultants_translate: {
        where: { locale: { in: [locale, fallback] } },
        select: { locale: true, name: true, description: true },
      },
    },
  });

  if (!row) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const t = pickTrans(row.consultants_translate, locale, fallback);
  const data = {
    id: row.id,
    email: row.email,
    whatsapp: row.whatsapp,
    profile_image_url: row.profile_image_url,
    program_consultant_image_url: row.program_consultant_image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: t?.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
  };

  return json({ data });
}

/* ===== PATCH /api/consultants/:id (UPDATE + upsert translations) =====
Body (opsional):
- email?, whatsapp?, profile_image_url?, program_consultant_image_url?
- name_id?, description_id?  (upsert locale "id")
- name_en?, description_en?  (upsert locale "en")
- autoTranslate? default false (set true untuk regen EN dari ID terbaru)
*/
export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const parentData = {};
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    parentData.email = body.email ? String(body.email).trim() || null : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "whatsapp")) {
    parentData.whatsapp = body.whatsapp
      ? String(body.whatsapp).trim() || null
      : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "profile_image_url")) {
    parentData.profile_image_url = body.profile_image_url
      ? String(body.profile_image_url).trim() || null
      : null;
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "program_consultant_image_url")
  ) {
    parentData.program_consultant_image_url = body.program_consultant_image_url
      ? String(body.program_consultant_image_url).trim() || null
      : null;
  }
  if (Object.keys(parentData).length) parentData.updated_at = new Date();

  // confirm exists first if no parentData
  if (!Object.keys(parentData).length) {
    const exists = await prisma.consultants.findUnique({ where: { id } });
    if (!exists) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  } else {
    try {
      await prisma.consultants.update({ where: { id }, data: parentData });
    } catch (e) {
      if (e?.code === "P2002") {
        const field = e?.meta?.target?.join?.(", ") || "unique";
        return json(
          { error: { code: "CONFLICT", message: `${field} already in use` } },
          { status: 409 }
        );
      }
      if (e?.code === "P2025")
        return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
      throw e;
    }
  }

  const ops = [];

  // Upsert ID locale
  if (
    Object.prototype.hasOwnProperty.call(body, "name_id") ||
    Object.prototype.hasOwnProperty.call(body, "description_id")
  ) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: {
          id_consultant_locale: { id_consultant: id, locale: "id" },
        },
        update: {
          ...(Object.prototype.hasOwnProperty.call(body, "name_id")
            ? { name: String(body.name_id ?? "(no title)").slice(0, 150) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(body, "description_id")
            ? { description: body.description_id ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "id",
          name: String(body.name_id ?? "(no title)").slice(0, 150),
          description: body.description_id ?? null,
        },
      })
    );
  }

  // Upsert EN locale (explicit)
  if (
    Object.prototype.hasOwnProperty.call(body, "name_en") ||
    Object.prototype.hasOwnProperty.call(body, "description_en")
  ) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: {
          id_consultant_locale: { id_consultant: id, locale: "en" },
        },
        update: {
          ...(Object.prototype.hasOwnProperty.call(body, "name_en")
            ? { name: String(body.name_en ?? "(no title)").slice(0, 150) }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(body, "description_en")
            ? { description: body.description_en ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "en",
          name: String(body.name_en ?? "(no title)").slice(0, 150),
          description: body.description_en ?? null,
        },
      })
    );
  }

  // Auto translate EN from latest ID if requested
  if (
    body?.autoTranslate &&
    (Object.prototype.hasOwnProperty.call(body, "name_id") ||
      Object.prototype.hasOwnProperty.call(body, "description_id"))
  ) {
    let name_en;
    let description_en;
    try {
      if (Object.prototype.hasOwnProperty.call(body, "name_id") && body.name_id)
        name_en = await translate(String(body.name_id), "id", "en");
    } catch (e) {
      console.error("auto-translate name (consultant) failed:", e);
    }
    try {
      if (
        Object.prototype.hasOwnProperty.call(body, "description_id") &&
        body.description_id
      )
        description_en = await translate(
          String(body.description_id),
          "id",
          "en"
        );
    } catch (e) {
      console.error("auto-translate description (consultant) failed:", e);
    }

    if (name_en !== undefined || description_en !== undefined) {
      ops.push(
        prisma.consultants_translate.upsert({
          where: {
            id_consultant_locale: { id_consultant: id, locale: "en" },
          },
          update: {
            ...(name_en ? { name: name_en.slice(0, 150) } : {}),
            ...(description_en !== undefined
              ? { description: description_en ?? null }
              : {}),
            updated_at: new Date(),
          },
          create: {
            id: randomUUID(),
            id_consultant: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 150),
            description: description_en ?? null,
          },
        })
      );
    }
  }

  if (ops.length) await prisma.$transaction(ops);

  return json({ data: { id } });
}

/* ===== DELETE /api/consultants/:id (HARD DELETE) ===== */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = parseId(params?.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  try {
    await prisma.consultants.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error(`DELETE /api/consultants/${id} error:`, e);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
