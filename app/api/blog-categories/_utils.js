// app/api/blog-categories/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* ============ Config ============ */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";
export const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

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
export function notFound(message = "Kategori blog tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}
export function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ============ Auth (session OR x-admin-key) ============ */
export async function assertAdmin(req) {
  const key = req.headers?.get?.("x-admin-key");
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

/* ============ Slug helpers ============ */
export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
export function isValidSlug(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 100;
}

/* ============ Query builders ============ */
export function buildOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "sort"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
export function buildCategoryWhere({
  q,
  locale,
  fallback,
  withDeleted,
  onlyDeleted,
}) {
  return {
    ...(onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null }),
    ...(q
      ? {
          translate: {
            some: {
              locale: { in: [locale, fallback] },
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };
}

/* ============ Projector ============ */
export function projectCategoryRow(r, { locale, fallback }) {
  const t = pickTrans(r.translate, locale, fallback);
  const created_ts = r?.created_at ? new Date(r.created_at).getTime() : null;
  const updated_ts = r?.updated_at ? new Date(r.updated_at).getTime() : null;
  return {
    id: r.id,
    slug: r.slug,
    sort: r.sort,
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at ?? null,
    created_ts,
    updated_ts,
    name: t?.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
  };
}
