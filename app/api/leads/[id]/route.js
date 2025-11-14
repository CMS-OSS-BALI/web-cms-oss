// app/api/leads/[id]/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  parseDate,
  parseId,
  readBodyFlexible,
  assertAdmin,
  withTs,
} from "@/app/api/leads/_utils";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/app/utils/watzap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENABLE_ASSIGNMENT_WA =
  String(process.env.WATZAP_ENABLE_ASSIGNMENT_WA || "").toLowerCase() ===
  "true";

/* ===== whatsapp helpers ===== */
function normalizePhone(value) {
  if (!value) return "";
  try {
    return formatPhoneNumber(String(value).trim());
  } catch {
    return String(value).trim();
  }
}
async function sendAssignmentWA(lead, consultant) {
  if (!ENABLE_ASSIGNMENT_WA) return;
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
    console.error("[watzap] gagal kirim WA assignment", {
      message: err?.message,
      status: err?.response?.status,
      code: err?.code,
    });
  }
}

/* ========== GET detail ========== */
export async function GET(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login terlebih dahulu.");
    if (status === 403) return forbidden("Anda tidak memiliki akses.");
    return unauthorized();
  }

  const sp = new URL(req.url).searchParams;
  const includeReferral = sp.get("include_referral") === "1";
  const id = String(params.id || "").trim();
  if (!id) return badRequest("Parameter id wajib diisi.", "id");

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

  if (!item) return notFound("Data lead tidak ditemukan.");
  return json({ message: "OK", data: withTs(item) });
}

/* ========== PATCH update ========== */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login terlebih dahulu.");
    if (status === 403) return forbidden("Anda tidak memiliki akses.");
    return unauthorized();
  }

  const id = String(params.id || "").trim();
  if (!id) return badRequest("Parameter id wajib diisi.", "id");

  const body = await readBodyFlexible(req);
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
  if (!existing) return notFound("Data lead tidak ditemukan.");

  // full_name
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

  // optional scalar fields
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
    data.assigned_to = assignedToValue; // can be null
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

  // if assigned_to set (non-null) and no assigned_at provided, auto set now
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
    data.referral_id = newReferralId; // may be null
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

    // notify consultant if assignment changed
    if (assignedToChanged && updated.assigned_to) {
      const consultant = await prisma.consultants.findUnique({
        where: { id: updated.assigned_to },
        select: { id: true, whatsapp: true },
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
          message: "Terjadi kesalahan di sisi server.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========== DELETE (soft) ========== */
export async function DELETE(req, { params }) {
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login terlebih dahulu.");
    if (status === 403) return forbidden("Anda tidak memiliki akses.");
    return unauthorized();
  }

  const id = String(params.id || "").trim();
  if (!id) return badRequest("Parameter id wajib diisi.", "id");

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

    return json(
      { message: "Lead berhasil dihapus (soft delete)." },
      { status: 200 }
    );
  } catch (e) {
    const status = e?.status || 500;
    if (status === 404) return notFound("Data lead tidak ditemukan.");
    console.error("[DELETE /api/leads/:id] error:", e?.message || e);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server.",
        },
      },
      { status: 500 }
    );
  }
}
