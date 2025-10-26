// app/api/referral/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/app/utils/watzap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = ["PENDING", "REJECTED", "VERIFIED"];
const GENDERS = ["MALE", "FEMALE"];

const json = (b, i) => NextResponse.json(sanitize(b), i);
const sanitize = (v) =>
  v == null
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
  typeof v === "string" ? v.trim().slice(0, m) : v === null ? null : undefined;
const pickEnum = (v, allowed) => {
  if (!v || typeof v !== "string") return null;
  const up = v.toUpperCase();
  return allowed.includes(up) ? up : null;
};
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ---- timestamps helper ---- */
const toMs = (d) => {
  if (!d) return null;
  try {
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
};
const withTs = (row) =>
  row
    ? {
        ...row,
        created_ts: toMs(row.created_at),
        updated_ts: toMs(row.updated_at),
        deleted_at_ts: toMs(row.deleted_at),
      }
    : row;

function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(path);
  return data?.publicUrl || null;
}
async function generateUniqueReferralCode() {
  const year = new Date().getFullYear();
  const prefix = `OSSBALI/${year}/REFERRAL-66B`;
  for (let i = 0; i < 20; i++) {
    const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const code = `${prefix}${suffix}`;
    const exists = await prisma.referral.count({ where: { code } });
    if (exists === 0) return code;
  }
  return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(
    3,
    "0"
  )}`;
}

/* ===== GET ===== */
export async function GET(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }

  const id = String(params?.id || "");
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  // return all columns then add *_ts
  const row = await prisma.referral.findUnique({ where: { id } });
  if (!row) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const previews = { front: getPublicUrl(row.front_url) };
  return json({ data: withTs(row), previews });
}

/* ===== PATCH ===== */
export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }
  const id = String(params?.id || "");
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  const ct = req.headers.get("content-type") || "";
  const data = {};
  let replacedFront = false;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();

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
      data.front_url = objectPath;
      replacedFront = true;
    }

    const status = form.get("status");
    if (status && STATUSES.includes(String(status).toUpperCase()))
      data.status = String(status).toUpperCase();

    if (form.has("notes")) data.notes = trimStr(form.get("notes"), 255) ?? null;

    if (form.has("pic_consultant_id")) {
      const v = trimStr(form.get("pic_consultant_id"), 36);
      if (v) {
        const pic = await prisma.consultants.findUnique({
          where: { id: v },
          select: { id: true },
        });
        if (!pic)
          return json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "PIC Konsultan tidak ditemukan",
              },
            },
            { status: 422 }
          );
        data.pic_consultant_id = v;
      } else data.pic_consultant_id = null;
    }
  } else {
    const body = await req.json().catch(() => ({}));

    if (body.full_name !== undefined)
      data.full_name = trimStr(body.full_name, 150) ?? null;
    if (body.email !== undefined) data.email = trimStr(body.email, 191) ?? null;

    if (body.whatsapp !== undefined) {
      const w = trimStr(body.whatsapp, 32) ?? null;
      data.whatsapp = w;
      data.whatsapp_e164 = w ? formatPhoneNumber(w) : null;
    }

    if (body.gender !== undefined) {
      const g = pickEnum(body.gender, GENDERS);
      if (!g)
        return json(
          { error: { code: "VALIDATION_ERROR", message: "invalid gender" } },
          { status: 422 }
        );
      data.gender = g;
    }
    if (body.date_of_birth !== undefined)
      data.date_of_birth = parseDate(body.date_of_birth);

    [
      "address_line",
      "rt",
      "rw",
      "kelurahan",
      "kecamatan",
      "city",
      "province",
      "postal_code",
      "domicile",
      "notes",
    ].forEach((k) => {
      if (body[k] !== undefined)
        data[k] = trimStr(body[k], k === "notes" ? 255 : 191) ?? null;
    });

    if (body.pic_consultant_id !== undefined) {
      const v = trimStr(body.pic_consultant_id, 36);
      if (v) {
        const pic = await prisma.consultants.findUnique({
          where: { id: v },
          select: { id: true },
        });
        if (!pic)
          return json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "PIC Konsultan tidak ditemukan",
              },
            },
            { status: 422 }
          );
        data.pic_consultant_id = v;
      } else data.pic_consultant_id = null;
    }

    if (body.status !== undefined) {
      const s = String(body.status || "").toUpperCase();
      if (!STATUSES.includes(s))
        return json(
          { error: { code: "VALIDATION_ERROR", message: "invalid status" } },
          { status: 422 }
        );
      data.status = s;
    }
  }

  try {
    const before = await prisma.referral.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        whatsapp: true,
        whatsapp_e164: true,
        status: true,
        code: true,
      },
    });
    if (!before) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

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
        front_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        code: true,
        pic_consultant_id: true,
        notes: true,
      },
    });

    const wasVerified = before.status === "VERIFIED";
    const isVerified = updated.status === "VERIFIED";
    const becameVerified = !wasVerified && isVerified;

    let codeCreatedNow = false;
    if (isVerified && !updated.code) {
      for (let i = 0; i < 5; i++) {
        const candidate = await generateUniqueReferralCode();
        try {
          const after = await prisma.referral.update({
            where: { id },
            data: { code: candidate },
            select: { code: true },
          });
          updated.code = after.code;
          codeCreatedNow = true;
          break;
        } catch (e) {
          if (e?.code !== "P2002") break;
        }
      }
    }

    const phone = updated.whatsapp_e164 || updated.whatsapp;
    if (phone) {
      if (becameVerified) {
        const msg =
          `Halo ${updated.full_name}, pengajuan referral Anda telah *VERIFIED*.\n` +
          (updated.code
            ? `Kode referral Anda: *${updated.code}*.`
            : `Kode referral belum dapat diterbitkan saat ini.`) +
          `\nTerima kasih sudah mendaftar di OSS Bali.`;
        sendWhatsAppMessage(phone, msg).catch(() => {});
      } else if (isVerified && codeCreatedNow) {
        const msg = `Halo ${updated.full_name}, kode referral Anda telah diterbitkan: *${updated.code}*.\nBagikan kode ini ke calon leads.`;
        sendWhatsAppMessage(phone, msg).catch(() => {});
      }
      if (data.status === "REJECTED" && before.status !== "REJECTED") {
        const reason = updated.notes ? `\nAlasan: ${updated.notes}` : "";
        const msg = `Halo ${updated.full_name}, mohon maaf pengajuan referral Anda *REJECTED*.${reason}\nAnda dapat mengoreksi data lalu mengajukan kembali.`;
        sendWhatsAppMessage(phone, msg).catch(() => {});
      }
    }

    const preview = replacedFront ? getPublicUrl(updated.front_url) : null;
    return json({
      data: withTs(updated),
      replaced_front: replacedFront,
      preview_front: preview,
    });
  } catch (err) {
    if (err?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error("PATCH referral error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

/* ===== DELETE ===== */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return handleAuthError(err);
  }
  const id = String(params?.id || "");
  if (!id) return json({ error: { code: "BAD_REQUEST" } }, { status: 400 });

  try {
    const deleted = await prisma.referral.update({
      where: { id },
      data: { deleted_at: new Date() },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return json({ data: withTs(deleted) });
  } catch (err) {
    if (err?.code === "P2025")
      return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    console.error("DELETE /api/referral/[id] error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
