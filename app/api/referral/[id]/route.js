// app/api/referral/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/app/utils/watzap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============== helpers ============== */
const STATUSES = [
  "PENDING",
  "AUTO_PASS",
  "NEED_REVIEW",
  "REJECTED",
  "VERIFIED",
];
const GENDERS = ["MALE", "FEMALE", "UNKNOWN"];

const json = (b, i) => NextResponse.json(b, i);
const sanitize = (v) =>
  v === null || v === undefined
    ? v
    : typeof v === "bigint"
    ? v.toString()
    : Array.isArray(v)
    ? v.map(sanitize)
    : typeof v === "object"
    ? Object.fromEntries(
        Object.entries(v).map(([k, val]) => [k, sanitize(val)])
      )
    : v;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}
const handleAuthError = (err) =>
  json(
    { error: { code: err?.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status: err?.status === 401 ? 401 : 403 }
  );

const trimStr = (v, m = 191) =>
  typeof v === "string" ? v.trim().slice(0, m) : null;
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const pickEnum = (v, allowed) => {
  if (!v || typeof v !== "string") return null;
  const up = v.toUpperCase();
  return allowed.includes(up) ? up : null;
};

// === NEW: getPublicUrl (no expiry) ===
function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(path);
  return data?.publicUrl || null;
}

/* ============== GET /api/referral/[id] ============== */
export async function GET(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = BigInt(params?.id || 0);
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  const row = await prisma.referral.findUnique({ where: { id } });
  if (!row) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const previews = { front: getPublicUrl(row.front_url) }; // permanent URL
  return json(sanitize({ data: row, previews }));
}

/* ============== PATCH /api/referral/[id] ============== */
export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = BigInt(params?.id || 0);
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  const ct = req.headers.get("content-type") || "";
  const data = {};
  let replacedFront = false;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();

    // Replace KTP image if provided
    const f = form.get("front");
    if (f instanceof File) {
      const MAX = 5 * 1024 * 1024;
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if ((f.size || 0) > MAX)
        return json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
      if (!allowed.includes(f.type))
        return json({ error: { code: "UNSUPPORTED_TYPE" } }, { status: 415 });

      const existing = await prisma.referral.findUnique({
        where: { id },
        select: { nik: true },
      });
      if (!existing)
        return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

      const ext = (f.name?.split(".").pop() || "").toLowerCase();
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
        ext ? "." + ext : ""
      }`;
      const objectPath = `referral/${existing.nik}/${safe}`;
      const bytes = new Uint8Array(await f.arrayBuffer());

      const { error } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(objectPath, bytes, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        });
      if (error) throw new Error(error.message);

      data.front_url = objectPath; // store PATH
      replacedFront = true;
    }

    // optional status change (multipart)
    const status = form.get("status");
    if (status && STATUSES.includes(String(status).toUpperCase())) {
      data.status = String(status).toUpperCase();
    }
  } else {
    // JSON body updates
    const body = await req.json().catch(() => ({}));

    if (body.full_name !== undefined)
      data.full_name = trimStr(body.full_name, 150) || null;
    if (body.email !== undefined) data.email = trimStr(body.email, 191) || null;
    if (body.whatsapp !== undefined) {
      const w = trimStr(body.whatsapp, 32) || null;
      data.whatsapp = w;
      data.whatsapp_e164 = w ? formatPhoneNumber(w) : null;
    }
    if (body.gender !== undefined) {
      const g = pickEnum(body.gender, GENDERS);
      if (!g) {
        return json(
          { error: { code: "VALIDATION_ERROR", message: "invalid gender" } },
          { status: 422 }
        );
      }
      data.gender = g;
    }
    if (body.date_of_birth !== undefined)
      data.date_of_birth = parseDate(body.date_of_birth);

    // optional address/contact fields
    if (body.address_line !== undefined)
      data.address_line = trimStr(body.address_line, 191) || null;
    if (body.rt !== undefined) data.rt = trimStr(body.rt, 3) || null;
    if (body.rw !== undefined) data.rw = trimStr(body.rw, 3) || null;
    if (body.kelurahan !== undefined)
      data.kelurahan = trimStr(body.kelurahan, 64) || null;
    if (body.kecamatan !== undefined)
      data.kecamatan = trimStr(body.kecamatan, 64) || null;
    if (body.city !== undefined) data.city = trimStr(body.city, 64) || null;
    if (body.province !== undefined)
      data.province = trimStr(body.province, 64) || null;
    if (body.postal_code !== undefined)
      data.postal_code = trimStr(body.postal_code, 10) || null;
    if (body.domicile !== undefined)
      data.domicile = trimStr(body.domicile, 100) || null;
    if (body.consent_agreed !== undefined)
      data.consent_agreed = Boolean(body.consent_agreed);

    if (body.status !== undefined) {
      const s = String(body.status || "").toUpperCase();
      if (!STATUSES.includes(s)) {
        return json(
          { error: { code: "VALIDATION_ERROR", message: "invalid status" } },
          { status: 422 }
        );
      }
      data.status = s;
    }
  }

  try {
    const updated = await prisma.referral.update({
      where: { id },
      data,
      select: {
        id: true,
        nik: true,
        full_name: true,
        email: true,
        whatsapp: true,
        whatsapp_e164: true,
        gender: true,
        status: true,
        front_url: true, // PATH
        updated_at: true,
      },
    });

    // Optional WA on approve/auto-pass
    if (
      data.status &&
      (data.status === "VERIFIED" || data.status === "AUTO_PASS")
    ) {
      const phone = updated.whatsapp_e164 || updated.whatsapp;
      if (phone) {
        const msg = `Halo ${updated.full_name}, pengajuan referral Anda telah *${updated.status}*.\nTerima kasih sudah mendaftar di OSS Bali.`;
        sendWhatsAppMessage(phone, msg).catch((e) =>
          console.error("WA send error:", e?.message || e)
        );
      }
    }

    const preview = replacedFront ? getPublicUrl(updated.front_url) : null;
    return json(
      sanitize({
        data: updated,
        replaced_front: replacedFront,
        preview_front: preview, // permanent public URL (or null if not replaced)
      })
    );
  } catch (err) {
    if (err?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error("PATCH referral error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

/* ============== DELETE /api/referral/[id] ============== */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = BigInt(params?.id || 0);
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  try {
    const deleted = await prisma.referral.update({
      where: { id },
      data: { deleted_at: new Date() },
      select: { id: true, deleted_at: true },
    });
    return json(sanitize({ data: deleted }));
  } catch (err) {
    if (err?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error("DELETE /api/referral/[id] error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
