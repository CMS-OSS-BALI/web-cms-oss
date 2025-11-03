// app/api/event-categories/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* =================== Core JSON helpers =================== */
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

/* =================== Common parsing helpers =================== */
export function asInt(v, dflt = 0) {
  if (v === null || v === undefined || v === "") return dflt;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : dflt;
}
export function pickLocale(reqOrUrl, key = "locale", dflt = "id") {
  try {
    const url =
      typeof reqOrUrl === "string" ? new URL(reqOrUrl) : new URL(reqOrUrl.url);
    return (url.searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
export function getOrderBy(param) {
  // format: "field:asc|desc"
  const allowed = new Set(["sort", "created_at", "updated_at"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }];
}
export function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* =================== Validation helpers =================== */
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
export function notFound(message = "Kategori event tidak ditemukan.") {
  return json({ error: { code: "NOT_FOUND", message } }, { status: 404 });
}
export function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
export function isValidSlug(slug) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug)) &&
    String(slug).length <= 100
  );
}

/* =================== Auth helper =================== */
export async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return admin.id;
}

/* =================== Body reader =================== */
export async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
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
