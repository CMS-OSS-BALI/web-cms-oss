// /app/api/aktivitas/_utils.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* -------------------- config -------------------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DEFAULT_LOCALE = "id";
export const EN_LOCALE = "en";
export const BUCKET = process.env.SUPABASE_BUCKET;
export const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
export const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

/* -------------------- tiny utils -------------------- */
export function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
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
export function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
export function toBool(v, dflt = null) {
  if (v === null || v === undefined || v === "") return dflt;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return dflt;
}
export function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
export function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
export function getOrderBy(param) {
  const allowed = new Set(["sort", "created_at", "updated_at"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  // fallback second order untuk stabilitas list
  return [{ [key]: order }, { created_at: "desc" }];
}
export function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
export const toMs = (d) => {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

/* -------------------- auth -------------------- */
export async function assertAdmin(req) {
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

/* -------------------- body & upload -------------------- */
export async function readBodyAndFile(req) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = contentType.startsWith("multipart/form-data");
  const isUrlEncoded = contentType.startsWith(
    "application/x-www-form-urlencoded"
  );

  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;
    for (const k of ["image", "file", "image_file", "image_url"]) {
      const f = form.get(k);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) if (!(v instanceof File)) body[k] = v;
    return { body, file };
  }
  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

export async function uploadAktivitasImage(file) {
  if (!file) return null;
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const size = file.size || 0;
  const type = file.type || "";
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (size > 10 * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `aktivitas/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath;
}
