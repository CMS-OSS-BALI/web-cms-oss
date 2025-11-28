// app/api/jenjang-master/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* ============ Config ============ */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

/* ============ JSON helpers ============ */
export function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
export function json(data, init) {
  const base = { headers: { "Cache-Control": "no-store" } };
  const merged =
    init?.headers || init?.status
      ? {
          ...base,
          ...init,
          headers: { ...base.headers, ...(init.headers || {}) },
        }
      : base;
  return NextResponse.json(sanitize(data), merged);
}

/* ============ Small utils ============ */
export const clampInt = (v, min, max, dflt) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(Math.max(n, min), max);
};

export function pickLocale(req, key = "locale", dflt = DEFAULT_LOCALE) {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}

export function badRequest(message, field, hint) {
  return json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(field ? { field } : {}),
        ...(hint ? { hint } : {}),
      },
    },
    { status: 400 }
  );
}

export function notFound(message = "Data jenjang tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

export function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ============ Auth (NextAuth admin session) ============ */
export async function assertAdmin(req) {
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

/* ============ Body reader (form | urlencoded | json) ============ */
export async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries())
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* ============ Order & Where builders ============ */
export function buildOrderBy(param) {
  // izinkan sort by: created_at, updated_at, sort, code
  const allowed = new Set(["created_at", "updated_at", "sort", "code"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }];
}

/**
 * withInactive = "1" => tampilkan aktif + nonaktif
 * onlyInactive = "1" => hanya nonaktif
 * default           => hanya yang aktif
 */
export function buildJenjangWhere({
  q,
  locale,
  fallback,
  withInactive,
  onlyInactive,
}) {
  const where = {};

  if (onlyInactive) {
    where.is_active = false;
  } else if (withInactive) {
    // no filter
  } else {
    where.is_active = true;
  }

  if (q) {
    where.OR = [
      {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        jenjang_master_translate: {
          some: {
            locale: { in: [locale, fallback] },
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  return where;
}

/* ============ Projector ============ */
export function projectJenjangRow(r, { locale, fallback }) {
  const t = pickTrans(r.jenjang_master_translate, locale, fallback);
  const created_ts = r?.created_at ? new Date(r.created_at).getTime() : null;
  const updated_ts = r?.updated_at ? new Date(r.updated_at).getTime() : null;

  return {
    id: r.id,
    code: r.code,
    sort: r.sort,
    is_active: r.is_active,
    created_at: r.created_at,
    updated_at: r.updated_at,
    created_ts,
    updated_ts,
    // nama: prioritaskan translate, fallback ke master.name
    name: t?.name ?? r.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
  };
}
