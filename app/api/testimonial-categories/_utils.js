// app/api/testimonial-categories/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* ===== JSON helpers (BigInt-safe) ===== */
export function sanitize(v) {
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
export function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}

/* ===== standard errors ===== */
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
export function unauthorized(
  message = "Akses ditolak. Silakan login sebagai admin."
) {
  return json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}
export function forbidden(
  message = "Anda tidak memiliki akses ke resource ini."
) {
  return json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}
export function notFound(message = "Data tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}

/* ===== auth: NextAuth admin session ===== */
export async function assertAdmin(req) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/* ===== parsing helpers ===== */
export function readQuery(req) {
  return new URL(req.url).searchParams;
}
export async function readBodyFlexible(req) {
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

/* ===== locale & text helpers ===== */
export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";

export function normalizeLocale(v, fallback = DEFAULT_LOCALE) {
  return (v || fallback).toLowerCase().slice(0, 5);
}
export function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
export function trimOrNull(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function slugify(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
export function isValidSlug(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 100;
}
export async function ensureUniqueSlug(baseSlug, excludeId) {
  if (!baseSlug) return null;
  let slug = baseSlug;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.testimonial_categories.findFirst({
      where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
      select: { id: true },
    });
    if (!found) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

/* ===== sort helper ===== */
export function getOrderBy(param) {
  // NB: tabel ini lazimnya aman untuk sort by 'slug'.
  // Jika schema punya created_at/updated_at, ini juga didukung.
  const allowed = new Set(["slug", "created_at", "updated_at"]);
  const [field = "slug", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "slug";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }];
}

/* ===== ts helper (aman bila kolom tidak ada / undefined) ===== */
export function toTs(d) {
  if (!d) return null;
  const t = new Date(String(d)).getTime();
  return Number.isFinite(t) ? t : null;
}
