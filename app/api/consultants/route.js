// app/api/consultants/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";

const DEFAULT_ORDER = [{ created_at: "desc" }];

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
function normalizeOrder(sort) {
  if (!sort) return DEFAULT_ORDER;
  const [field = "", dir = ""] = String(sort).split(":");
  const allowed = new Set(["created_at", "updated_at", "email"]);
  const key = allowed.has(field) ? field : "created_at";
  const order = dir?.toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
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

/* ===== GET /api/consultants (LIST) =====
Query:
- q: search di name/description (consultants_translate) + email/whatsapp
- page, perPage, sort (created_at|updated_at|email):(asc|desc)
- locale (default id), fallback (default id)
*/
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const isPublic = searchParams.get("public") === "1";

  // Admin gate only if NOT public
  if (!isPublic) {
    try {
      await requireAdmin();
    } catch (err) {
      return handleAuthError(err);
    }
  }

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    isPublic ? 12 : 100, // tighter cap for public
    Math.max(
      1,
      parseInt(searchParams.get("perPage") || (isPublic ? "3" : "10"), 10)
    )
  );
  const orderBy = normalizeOrder(searchParams.get("sort"));

  const locale = pickLocale(req, "locale", "id");
  const fallback = pickLocale(req, "fallback", "id");

  const where =
    q.length > 0
      ? {
          OR: [
            {
              consultants_translate: {
                some: {
                  locale: { in: [locale, fallback] },
                  OR: [
                    { name: { contains: q } },
                    { description: { contains: q } },
                  ],
                },
              },
            },
            // admin can search email/whatsapp; public cannot (privacy)
            ...(isPublic
              ? []
              : [{ email: { contains: q } }, { whatsapp: { contains: q } }]),
          ],
        }
      : {};

  const selectPublic = {
    id: true,
    profile_image_url: true,
    program_consultant_image_url: true,
    created_at: true,
    updated_at: true,
    consultants_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true, description: true },
    },
  };

  const selectAdmin = {
    ...selectPublic,
    email: true,
    whatsapp: true,
  };

  const [total, rows] = await Promise.all([
    prisma.consultants.count({ where }),
    prisma.consultants.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: isPublic ? selectPublic : selectAdmin,
    }),
  ]);

  const data = rows.map((r) => {
    const t = pickTrans(r.consultants_translate, locale, fallback);
    return {
      id: r.id,
      // expose contacts only for admins
      email: isPublic ? null : r.email ?? null,
      whatsapp: isPublic ? null : r.whatsapp ?? null,
      profile_image_url: r.profile_image_url,
      program_consultant_image_url: r.program_consultant_image_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      name: t?.name ?? null,
      description: t?.description ?? null,
      locale_used: t?.locale ?? null,
    };
  });

  // Optional: cache public responses a bit
  const resp = json({
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      locale,
      fallback,
      public: isPublic,
    },
  });

  if (isPublic) {
    resp.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  }
  return resp;
}

/* ===== POST /api/consultants (CREATE + translations) =====
Body:
- email?, whatsapp?, profile_image_url?, program_consultant_image_url?
- name_id (required), description_id?
- name_en?, description_en?
- autoTranslate? default true
*/
export async function POST(req) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const body = await req.json().catch(() => ({}));

  const name_id = String(body?.name_id ?? "").trim();
  if (!name_id || name_id.length < 2) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "name_id wajib (min 2 chars)",
        },
      },
      { status: 422 }
    );
  }
  const description_id =
    typeof body?.description_id === "string" ? body.description_id : null;

  const email = body?.email ? String(body.email).trim() || null : null;
  const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() || null : null;
  const profile_image_url = body?.profile_image_url
    ? String(body.profile_image_url).trim() || null
    : null;
  const program_consultant_image_url = body?.program_consultant_image_url
    ? String(body.program_consultant_image_url).trim() || null
    : null;

  const autoTranslate = body?.autoTranslate !== false;

  let name_en = String(body?.name_en || "").trim();
  let description_en =
    typeof body?.description_en === "string" ? body.description_en : "";

  try {
    const created = await prisma.$transaction(async (tx) => {
      // parent
      const parent = await tx.consultants.create({
        data: {
          email,
          whatsapp,
          profile_image_url,
          program_consultant_image_url,
        },
        select: {
          id: true,
          email: true,
          whatsapp: true,
          profile_image_url: true,
          program_consultant_image_url: true,
          created_at: true,
          updated_at: true,
        },
      });

      // translate id
      await tx.consultants_translate.create({
        data: {
          id: randomUUID(),
          id_consultant: parent.id,
          locale: "id",
          name: name_id.slice(0, 150),
          description: description_id || null,
        },
      });

      // auto translate to en (optional)
      if (autoTranslate) {
        try {
          if (!name_en && name_id)
            name_en = await translate(name_id, "id", "en");
        } catch (e) {
          console.error("auto-translate name (consultant) failed:", e);
        }
        try {
          if (!description_en && description_id)
            description_en = await translate(description_id, "id", "en");
        } catch (e) {
          console.error("auto-translate description (consultant) failed:", e);
        }
      }

      if (name_en || description_en) {
        await tx.consultants_translate.create({
          data: {
            id: randomUUID(),
            id_consultant: parent.id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 150),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        data: {
          id: created.id,
          email: created.email,
          whatsapp: created.whatsapp,
          profile_image_url: created.profile_image_url,
          program_consultant_image_url: created.program_consultant_image_url,
          created_at: created.created_at,
          updated_at: created.updated_at,
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      const field = err?.meta?.target?.join?.(", ") || "unique";
      return json(
        { error: { code: "CONFLICT", message: `${field} already in use` } },
        { status: 409 }
      );
    }
    console.error("POST /api/consultants error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
