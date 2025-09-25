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

/* ---------- auth ---------- */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

/* ---------- small parsers ---------- */
function parseBigInt(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    const n = BigInt(value);
    if (n < 0) return null;
    return n;
  } catch {
    return null;
  }
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

/**
 * Kirim WA ke konsultan saat lead di-assign.
 * Tidak melempar error—kalau gagal, hanya log.
 */
async function notifyConsultantAssignment(lead, consultant) {
  // Pakai server env (bukan NEXT_PUBLIC)
  const apiKey = process.env.API_KEY_WATZAP;
  const numberKey = process.env.NUMBER_KEY_WATZAP;

  if (!consultant?.whatsapp) return;
  if (!apiKey || !numberKey) {
    console.warn(
      "[watzap] API_KEY_WATZAP / NUMBER_KEY_WATZAP tidak ditemukan. Lewati kirim WA."
    );
    return;
  }

  const phone = normalizePhone(consultant.whatsapp);
  if (!phone) return;

  const messageLines = [
    "*Penugasan Lead Baru*",
    "",
    `Halo ${consultant.name || "Konsultan"},`,
    "Anda baru saja menerima lead baru. Detailnya:",
    "",
    `• *Nama*              : ${lead.full_name || "-"}`,
    `• *Email*             : ${lead.email || "-"}`,
    `• *WhatsApp*          : ${lead.whatsapp || "-"}`,
    `• *Domisili*          : ${lead.domicile || "-"}`,
    `• *Pendidikan Terakhir*: ${lead.education_last || "-"}`,
    "",
    "_Mohon ditindaklanjuti secepatnya._",
    "Terima kasih 🙏",
  ];

  const message = messageLines.join("\n");

  try {
    await sendWhatsAppMessage(phone, message);
  } catch (err) {
    console.error(
      "[watzap] Gagal kirim notifikasi ke konsultan:",
      err?.message || err
    );
    if (err?.response?.data) {
      console.error("[watzap] response:", err.response.data);
    }
  }
}

/* ========== GET detail ========== */
export async function GET(_req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

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
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!item) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return json(item);
}

/* ========== PATCH update ========== */
export async function PATCH(req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  const body = await req.json().catch(() => ({}));
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
    },
  });
  if (!existing) return json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  // Validasi & mapping fields
  if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
    if (
      typeof body.full_name !== "string" ||
      body.full_name.trim().length < 2
    ) {
      return json(
        {
          error: { code: "VALIDATION_ERROR", message: "full_name min 2 chars" },
        },
        { status: 422 }
      );
    }
    data.full_name = body.full_name.trim();
  }

  for (const key of ["domicile", "whatsapp", "email", "education_last"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) {
    const assignedToValue = parseBigInt(body.assigned_to);
    if (body.assigned_to && assignedToValue === null) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "assigned_to must be a positive integer",
          },
        },
        { status: 422 }
      );
    }
    data.assigned_to = assignedToValue;
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigned_at")) {
    const assignedAtValue = parseDate(body.assigned_at);
    if (body.assigned_at && assignedAtValue === null) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "assigned_at must be a valid ISO date",
          },
        },
        { status: 422 }
      );
    }
    data.assigned_at = assignedAtValue;
  }

  if (!Object.keys(data).length) {
    return json({ error: { code: "NO_CHANGES" } }, { status: 400 });
  }

  // Deteksi perubahan assigned_to
  const assignedToChanged = Object.prototype.hasOwnProperty.call(
    data,
    "assigned_to"
  )
    ? (existing.assigned_to ?? null) !== (data.assigned_to ?? null)
    : false;

  // Jika baru di-assign & belum ada timestamp, set sekarang
  if (assignedToChanged && data.assigned_to && !data.assigned_at) {
    data.assigned_at = new Date();
  }
  data.updated_at = new Date();

  try {
    const updated = await prisma.leads.update({
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    // Kirim WA jika konsultan berubah & ada assigned_to yang baru
    if (assignedToChanged && updated.assigned_to) {
      const consultant = await prisma.consultants.findUnique({
        where: { id: updated.assigned_to },
        select: { id: true, name: true, whatsapp: true },
      });
      if (consultant) {
        await notifyConsultantAssignment(updated, consultant);
      }
    }

    return json(updated);
  } catch (e) {
    console.error("PATCH /leads/:id error:", e?.message || e);
    return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}

/* ========== DELETE (soft) ========== */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
  } catch {
    return json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return json({ error: { code: "BAD_ID" } }, { status: 400 });

  try {
    await prisma.leads.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /leads/:id error:", e?.message || e);
    return json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}
