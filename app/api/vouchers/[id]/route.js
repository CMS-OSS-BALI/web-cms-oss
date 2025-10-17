// app/api/vouchers/[id]/route.js
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
function json(d, i) {
  return NextResponse.json(sanitize(d), i);
}
function bad(m, f) {
  return json(
    { error: { code: "BAD_REQUEST", message: m, ...(f ? { field: f } : {}) } },
    { status: 400 }
  );
}
function notFound() {
  return json(
    { error: { code: "NOT_FOUND", message: "Voucher tidak ditemukan." } },
    { status: 404 }
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
  return undefined;
}
function sanitizeCode(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}
async function readBodyFlexible(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isUrlEncoded = ct.startsWith("application/x-www-form-urlencoded");
  if (isMultipart || isUrlEncoded) {
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

export async function GET(req, { params }) {
  try {
    await assertAdmin(req);
    const v = await prisma.vouchers.findUnique({
      where: { id: params?.id },
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
    });
    if (!v) return notFound();
    return json({ message: "OK", data: v });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    console.error(`GET /api/vouchers/${params?.id} error:`, err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Gagal memuat voucher." } },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
    const id = params?.id;
    const body = await readBodyFlexible(req); // <<< form-data/json ok

    const current = await prisma.vouchers.findUnique({
      where: { id },
      select: {
        type: true,
        value: true,
        max_discount: true,
        valid_from: true,
        valid_to: true,
      },
    });
    if (!current) return notFound();

    const data = {};

    if ("code" in body) {
      const code = sanitizeCode(body.code);
      if (!code) return bad("code tidak boleh kosong", "code");
      data.code = code;
    }
    if ("type" in body) {
      const t = String(body.type || "").toUpperCase();
      data.type = t === "PERCENT" ? "PERCENT" : "FIXED";
    }
    if ("value" in body) {
      const v = toInt(body.value, null);
      if (v == null) return bad("value wajib diisi", "value");
      data.value = v;
    }
    if ("max_discount" in body) {
      const md = toInt(body.max_discount, null);
      if (md != null && md < 0)
        return bad("max_discount harus >= 0 atau null", "max_discount");
      data.max_discount = md;
    }
    if ("is_active" in body) {
      const p = toBool(body.is_active);
      if (typeof p === "boolean") data.is_active = p;
    }
    if ("max_uses" in body) {
      const mu = toInt(body.max_uses, null);
      if (mu != null && mu < 0)
        return bad("max_uses harus >= 0 atau null", "max_uses");
      data.max_uses = mu;
    }
    if ("valid_from" in body || "valid_to" in body) {
      const vf =
        "valid_from" in body
          ? body.valid_from
            ? toDate(body.valid_from)
            : null
          : undefined;
      const vt =
        "valid_to" in body
          ? body.valid_to
            ? toDate(body.valid_to)
            : null
          : undefined;
      if (vf !== undefined) data.valid_from = vf;
      if (vt !== undefined) data.valid_to = vt;
      const fromC = vf !== undefined ? vf : current.valid_from ?? null;
      const toC = vt !== undefined ? vt : current.valid_to ?? null;
      if (fromC && toC && toC < fromC)
        return bad("valid_to harus >= valid_from", "valid_to");
    }
    if ("event_id" in body) {
      const ev = String(body.event_id || "").trim();
      data.event_id = ev || null;
    }

    // validate kombinasi akhir
    const t = data.type || current.type;
    const v = "value" in data ? data.value : current.value;
    const md =
      "max_discount" in data ? data.max_discount : current.max_discount;

    if (t === "FIXED") {
      if (v < 0) return bad("value (FIXED) harus >= 0", "value");
      data.max_discount = null;
    } else {
      if (v < 1 || v > 100) return bad("value (PERCENT) harus 1..100", "value");
      if (md != null && md < 0)
        return bad("max_discount harus >= 0 atau null", "max_discount");
    }

    if (Object.keys(data).length === 0) {
      const exists = await prisma.vouchers.findUnique({ where: { id } });
      if (!exists) return notFound();
      return json({ message: "Tidak ada perubahan.", data: exists });
    }

    data.updated_at = new Date();
    const updated = await prisma.vouchers.update({
      where: { id },
      data,
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
        updated_at: true,
      },
    });
    return json({ message: "Voucher diperbarui.", data: updated });
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
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/vouchers/${params?.id} error:`, err);
    return json(
      {
        error: { code: "SERVER_ERROR", message: "Gagal memperbarui voucher." },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
    const up = await prisma.vouchers.update({
      where: { id: params?.id },
      data: { is_active: false, updated_at: new Date() },
      select: { id: true, is_active: true },
    });
    return json({ message: "Voucher dinonaktifkan.", data: up });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401 || status === 403) return err;
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/vouchers/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal menonaktifkan voucher.",
        },
      },
      { status: 500 }
    );
  }
}
