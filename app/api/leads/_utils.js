// app/api/leads/_utils.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendNewLeadNotificationEmail } from "@/lib/mailer";

/* ===== JSON helpers (BigInt-safe) ===== */
export function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitize(val);
    return out;
  }
  return v;
}
export function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}

/* ===== standard error responders ===== */
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
export function unauthorized(message = "Akses ditolak.") {
  return json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}
export function forbidden(message = "Anda tidak memiliki akses.") {
  return json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}
export function notFound(message = "Tidak ditemukan.") {
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
export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function parseId(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
export function trimStr(v, max = 191) {
  return typeof v === "string" ? v.trim().slice(0, max) : null;
}
export function parseSort(sort) {
  if (!sort) return { created_at: "desc" };
  const [field, dir] = String(sort).split(":");
  const direction = (dir || "").toLowerCase() === "asc" ? "asc" : "desc";
  const allowed = new Set(["created_at", "full_name", "email"]);
  return allowed.has(field) ? { [field]: direction } : { created_at: "desc" };
}
export function readQuery(req) {
  return new URL(req.url).searchParams;
}

/* ===== body reader (form/urlencoded/json) ===== */
export async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      // Leads tidak menerima file: bila ada File, simpan nama file sebagai string
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* ===== time-stamp helpers ===== */
export function toMs(d) {
  if (!d) return null;
  try {
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}
export function withTs(row) {
  return {
    ...row,
    created_ts: toMs(row.created_at),
    updated_ts: toMs(row.updated_at),
    assigned_at_ts: toMs(row.assigned_at),
    deleted_at_ts: toMs(row.deleted_at),
  };
}

/* ===== notifikasi email: lead baru untuk semua admin ===== */
export async function notifyAdminsNewLead(lead) {
  if (!lead || !lead.id) return;

  const leadEmail = (lead.email || "").trim();

  // Ambil semua admin yang aktif dan punya email valid
  const admins = await prisma.admin_users.findMany({
    where: {
      deleted_at: null,
      email: {
        notIn: ["", leadEmail].filter(Boolean),
      },
    },
    select: {
      email: true,
      name: true,
    },
  });

  if (!admins.length) return;

  const to = admins.map((a) => (a.email || "").trim()).filter(Boolean);

  if (!to.length) return;

  // URL detail lead di panel admin (opsional)
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  const trimmed = base.replace(/\/+$/, "");
  const detailUrl = trimmed
    ? `${trimmed}/admin/leads?leadId=${encodeURIComponent(lead.id)}`
    : null;

  try {
    await sendNewLeadNotificationEmail({ to, lead, detailUrl });
  } catch (err) {
    console.error("[Leads] notifyAdminsNewLead error:", err?.message || err);
  }
}
