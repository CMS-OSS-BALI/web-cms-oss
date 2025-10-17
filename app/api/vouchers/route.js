// app/api/vouchers/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

function sanitize(v) {
  if (v == null) return v;
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
function bad(message, field) {
  return json(
    { error: { code: "BAD_REQUEST", message, ...(field ? { field } : {}) } },
    { status: 400 }
  );
}
function toInt(v, d = null) {
  if (v === "" || v == null || v === undefined) return d;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
function toDate(v) {
  if (!v && v !== 0) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toBool(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).toLowerCase();
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined; // biarkan caller putuskan default
}
function sanitizeCode(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

// ⇩⇩ NEW: helper untuk baca JSON / urlencoded / multipart ⇩⇩
async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue; // tidak ada file di voucher
      body[k] = v;
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const any = await prisma.admin_users.findFirst({ select: { id: true } });
    if (!any) throw new Response("Forbidden", { status: 403 });
    return any;
  }
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

/** GET /api/vouchers
 * - validate publik: ?code=ABC123[&event_id=...]
 * - admin list (pagination)
 */
export async function GET(req) {
  const url = new URL(req.url);
  const codeParam = (url.searchParams.get("code") || "").trim();
  const event_id = (url.searchParams.get("event_id") || "").trim() || null;

  if (codeParam) {
    const code = sanitizeCode(codeParam);
    if (!code) return json({ valid: false, reason: "INVALID_CODE" });

    const now = new Date();
    const v = await prisma.vouchers.findUnique({
      where: { code },
      select: {
        code: true,
        type: true,
        value: true,
        max_discount: true,
        is_active: true,
        max_uses: true,
        used_count: true,
        valid_from: true,
        valid_to: true,
        event_id: true,
      },
    });
    if (!v) return json({ valid: false, reason: "NOT_FOUND" });
    if (!v.is_active) return json({ valid: false, reason: "INACTIVE" });
    if (v.valid_from && v.valid_from > now)
      return json({ valid: false, reason: "NOT_YET_VALID" });
    if (v.valid_to && v.valid_to < now)
      return json({ valid: false, reason: "EXPIRED" });
    if (v.max_uses != null && v.used_count >= v.max_uses)
      return json({ valid: false, reason: "MAX_USED" });
    if (v.event_id && event_id && v.event_id !== event_id)
      return json({ valid: false, reason: "EVENT_NOT_MATCH" });

    return json({
      valid: true,
      data: {
        code: v.code,
        type: v.type,
        value: v.value,
        max_discount: v.max_discount,
      },
    });
  }

  // admin list
  try {
    await assertAdmin(req);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("perPage") || "20", 10))
    );
    const [total, rows] = await Promise.all([
      prisma.vouchers.count(),
      prisma.vouchers.findMany({
        orderBy: [{ created_at: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          max_discount: true,
          is_active: true,
          max_uses: true,
          used_count: true,
          valid_from: true,
          valid_to: true,
          event_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);
    return json({
      message: "OK",
      data: rows,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    console.error("GET /api/vouchers error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat voucher." } },
      { status: 500 }
    );
  }
}

/** POST /api/vouchers (admin) */
export async function POST(req) {
  try {
    await assertAdmin(req);
    const body = await readBodyFlexible(req); // <<< form-data/json ok

    const code = sanitizeCode(body?.code);
    if (!code) return bad("code wajib diisi (A-Z 0-9 _ -, max 64)", "code");

    const typeRaw = String(body?.type || "").toUpperCase();
    const type = typeRaw === "PERCENT" ? "PERCENT" : "FIXED";

    const value = toInt(body?.value, null);
    if (value == null) return bad("value wajib diisi", "value");

    let max_discount = toInt(body?.max_discount, null);
    if (type === "FIXED") {
      if (value < 0) return bad("value (FIXED) harus >= 0", "value");
      max_discount = null;
    } else {
      if (value < 1 || value > 100)
        return bad("value (PERCENT) harus 1..100", "value");
      if (max_discount != null && max_discount < 0)
        return bad("max_discount harus >= 0 atau null", "max_discount");
    }

    const max_uses = toInt(body?.max_uses, null);
    if (max_uses != null && max_uses < 0)
      return bad("max_uses harus >= 0 atau null", "max_uses");

    const valid_from = body?.valid_from ? toDate(body.valid_from) : null;
    const valid_to = body?.valid_to ? toDate(body.valid_to) : null;
    if (valid_from && valid_to && valid_to < valid_from)
      return bad("valid_to harus >= valid_from", "valid_to");

    const event_id = body?.event_id ? String(body.event_id).trim() : null;
    if (event_id) {
      const ev = await prisma.events.findUnique({
        where: { id: event_id },
        select: { id: true },
      });
      if (!ev) return bad("event_id tidak valid", "event_id");
    }

    // is_active dari form-data string
    const isActiveParsed = toBool(body?.is_active);
    const is_active =
      typeof isActiveParsed === "boolean"
        ? isActiveParsed
        : body?.is_active !== false;

    const created = await prisma.vouchers.create({
      data: {
        code,
        type,
        value,
        max_discount,
        is_active,
        max_uses,
        valid_from,
        valid_to,
        event_id: event_id || null,
      },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        max_discount: true,
        is_active: true,
        max_uses: true,
        used_count: true,
        valid_from: true,
        valid_to: true,
        event_id: true,
        created_at: true,
      },
    });

    return json(
      { message: "Voucher berhasil dibuat", data: created },
      { status: 201 }
    );
  } catch (err) {
    if (
      err?.code === "P2002" &&
      String(err?.meta?.target || "").includes("code")
    ) {
      return json(
        { error: { code: "CONFLICT", message: "Kode voucher sudah dipakai." } },
        { status: 409 }
      );
    }
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    console.error("POST /api/vouchers error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal membuat voucher." } },
      { status: 500 }
    );
  }
}
