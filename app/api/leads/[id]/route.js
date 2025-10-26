// app/api/leads/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/app/utils/watzap";

/* ---------- helpers: JSON / BigInt-safe ---------- */
function sanitize(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v);
    return out;
  }
  return value;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
const parseId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const toMs = (d) => {
  if (!d) return null;
  try {
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
};
const withTs = (row) => ({
  ...row,
  created_ts: toMs(row.created_at),
  updated_ts: toMs(row.updated_at),
  assigned_at_ts: toMs(row.assigned_at),
  deleted_at_ts: toMs(row.deleted_at),
});

// accept form-data / urlencoded / json
async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries()) {
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* ---------- whatsapp notify ---------- */
function normalizePhone(value) {
  if (!value) return "";
  try {
    return formatPhoneNumber(String(value).trim());
  } catch {
    return String(value).trim();
  }
}
async function sendAssignmentWA(lead, consultant) {
  const apiKey = process.env.API_KEY_WATZAP;
  const numberKey = process.env.NUMBER_KEY_WATZAP;
  if (!consultant?.whatsapp || !apiKey || !numberKey) return;

  const phone = normalizePhone(consultant.whatsapp);
  if (!phone) return;

  const msg = [
    "*Penugasan Lead Baru*",
    "",
    `Halo Konsultan,`,
    "Anda baru saja menerima lead baru:",
    "",
    `• *Nama*               : ${lead.full_name || "-"}`,
    `• *Email*              : ${lead.email || "-"}`,
    `• *WhatsApp*           : ${lead.whatsapp || "-"}`,
    `• *Domisili*           : ${lead.domicile || "-"}`,
    `• *Pendidikan Terakhir*: ${lead.education_last || "-"}`,
    "",
    "_Mohon ditindaklanjuti secepatnya._",
  ].join("\n");

  try {
    await sendWhatsAppMessage(phone, msg);
  } catch (err) {
    console.error("[watzap] gagal kirim WA:", err?.message || err);
    if (err?.response?.data)
      console.error("[watzap] response:", err.response.data);
  }
}

/* ========== GET detail ========== */
export async function GET(req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Silakan login terlebih dahulu.",
        },
      },
      { status: 401 }
    );
  }

  const includeReferral =
    new URL(req.url).searchParams.get("include_referral") === "1";
  const id = String(params.id || "").trim();
  if (!id) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Parameter id wajib diisi.",
          field: "id",
        },
      },
      { status: 400 }
    );
  }

  const item = await prisma.leads.findUnique({
    where: { id },
    select: {
      id: true,
      full_name: true,
      domicile: true,
      whatsapp: true,
      email: true,
      education_last: true,
      assigned_to: true,
      assigned_at: true,
      referral_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      ...(includeReferral
        ? {
            referral: {
              select: { id: true, full_name: true, code: true, status: true },
            },
          }
        : {}),
    },
  });

  if (!item) {
    return json(
      { error: { code: "NOT_FOUND", message: "Data lead tidak ditemukan." } },
      { status: 404 }
    );
  }
  return json({ message: "OK", data: withTs(item) });
}

/* ========== PATCH update ========== */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Silakan login terlebih dahulu.",
        },
      },
      { status: 401 }
    );
  }

  const id = String(params.id || "").trim();
  if (!id) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Parameter id wajib diisi.",
          field: "id",
        },
      },
      { status: 400 }
    );
  }

  const body = await readBody(req);
  const data = {};

  const existing = await prisma.leads.findUnique({
    where: { id },
    select: {
      id: true,
      full_name: true,
      domicile: true,
      whatsapp: true,
      email: true,
      education_last: true,
      assigned_to: true,
      assigned_at: true,
      referral_id: true,
    },
  });
  if (!existing) {
    return json(
      { error: { code: "NOT_FOUND", message: "Data lead tidak ditemukan." } },
      { status: 404 }
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
    if (
      typeof body.full_name !== "string" ||
      body.full_name.trim().length < 2
    ) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Nama lengkap minimal 2 karakter.",
            field: "full_name",
          },
        },
        { status: 422 }
      );
    }
    data.full_name = body.full_name.trim();
  }

  for (const key of ["domicile", "whatsapp", "email", "education_last"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = body[key];
  }

  // assignment
  let assignedToChanged = false;
  if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) {
    const assignedToValue = parseId(body.assigned_to);
    if (body.assigned_to && assignedToValue === null) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "ID konsultan tidak boleh kosong.",
            field: "assigned_to",
          },
        },
        { status: 422 }
      );
    }
    data.assigned_to = assignedToValue;
    assignedToChanged =
      (existing.assigned_to ?? null) !== (assignedToValue ?? null);
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigned_at")) {
    const assignedAtValue = parseDate(body.assigned_at);
    if (body.assigned_at && assignedAtValue === null) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Tanggal penugasan tidak valid.",
            field: "assigned_at",
            hint: "Gunakan format ISO 8601, contoh: 2025-01-17T08:00:00Z",
          },
        },
        { status: 422 }
      );
    }
    data.assigned_at = assignedAtValue;
  }

  if (assignedToChanged && data.assigned_to && !data.assigned_at) {
    data.assigned_at = new Date();
  }

  // referral changes
  let referralChange = false;
  let newReferralId = null;
  if (
    Object.prototype.hasOwnProperty.call(body, "referral_id") ||
    Object.prototype.hasOwnProperty.call(body, "referral_code")
  ) {
    newReferralId = parseId(body.referral_id);
    const code =
      typeof body.referral_code === "string" ? body.referral_code.trim() : "";

    if (!newReferralId && code) {
      const found = await prisma.referral.findFirst({
        where: { code, deleted_at: null },
        select: { id: true },
      });
      if (!found) {
        return json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Kode referral tidak ditemukan atau sudah tidak aktif.",
              field: "referral_code",
            },
          },
          { status: 422 }
        );
      }
      newReferralId = found.id;
    }
    data.referral_id = newReferralId; // boleh null
    referralChange = (existing.referral_id ?? null) !== (newReferralId ?? null);
  }

  if (!Object.keys(data).length) {
    return json(
      {
        error: {
          code: "NO_CHANGES",
          message: "Tidak ada perubahan yang dikirim.",
        },
      },
      { status: 400 }
    );
  }
  data.updated_at = new Date();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.leads.update({
        where: { id },
        data,
        select: {
          id: true,
          full_name: true,
          domicile: true,
          whatsapp: true,
          email: true,
          education_last: true,
          assigned_to: true,
          assigned_at: true,
          referral_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

      if (referralChange) {
        if (existing.referral_id) {
          await tx.referral
            .update({
              where: { id: existing.referral_id },
              data: { leads_count: { decrement: 1 } },
            })
            .catch(() => {});
        }
        if (newReferralId) {
          await tx.referral
            .update({
              where: { id: newReferralId },
              data: { leads_count: { increment: 1 } },
            })
            .catch(() => {});
        }
      }

      return upd;
    });

    // notify WA jika konsultan berubah
    if (assignedToChanged && updated.assigned_to) {
      const consultant = await prisma.consultants.findUnique({
        where: { id: updated.assigned_to },
        select: { id: true, whatsapp: true }, // name tidak ada di schema base
      });
      if (consultant) await sendAssignmentWA(updated, consultant);
    }

    return json({
      message: "Lead berhasil diperbarui.",
      data: withTs(updated),
    });
  } catch (e) {
    console.error("[PATCH /api/leads/:id] error:", e?.message || e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========== DELETE (soft) ========== */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Silakan login terlebih dahulu.",
        },
      },
      { status: 401 }
    );
  }

  const id = String(params.id || "").trim();
  if (!id) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Parameter id wajib diisi.",
          field: "id",
        },
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ex = await tx.leads.findUnique({
        where: { id },
        select: { id: true, referral_id: true, deleted_at: true },
      });
      if (!ex) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });

      if (!ex.deleted_at) {
        await tx.leads.update({
          where: { id },
          data: { deleted_at: new Date() },
        });
        if (ex.referral_id) {
          await tx.referral
            .update({
              where: { id: ex.referral_id },
              data: { leads_count: { decrement: 1 } },
            })
            .catch(() => {});
        }
      }
    });
    // balas 200 + message agar mudah dipakai UI/automation
    return json(
      { message: "Lead berhasil dihapus (soft delete)." },
      { status: 200 }
    );
  } catch (e) {
    const status = e?.status || 500;
    if (status === 404) {
      return json(
        { error: { code: "NOT_FOUND", message: "Data lead tidak ditemukan." } },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/leads/:id] error:", e?.message || e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
