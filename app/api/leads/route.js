// app/api/leads/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/* ---- utils ---- */
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
function parseSort(sort) {
  if (!sort) return { created_at: "desc" };
  const [field, dir] = String(sort).split(":");
  const direction = (dir || "").toLowerCase() === "asc" ? "asc" : "desc";
  const allowed = new Set(["created_at", "full_name", "email"]);
  return allowed.has(field) ? { [field]: direction } : { created_at: "desc" };
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
const trimStr = (v, m = 191) =>
  typeof v === "string" ? v.trim().slice(0, m) : null;
const parseId = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

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
      // Leads endpoint tidak menerima file; kalau ada, treat as filename string
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    }
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* =========================
   GET /api/leads  (admin)
   ========================= */
export async function GET(req) {
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

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const education = searchParams.get("education") || undefined;

  const assignedToRaw = searchParams.get("assigned_to");
  const onlyAssigned = searchParams.get("only_assigned") === "1";
  const includeAssigned = searchParams.get("include_assigned") === "1";
  const assignedTo = parseId(assignedToRaw);
  if (assignedToRaw && assignedTo === null) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parameter tidak valid.",
          field: "assigned_to",
          hint: "Nilai harus berupa string tidak kosong.",
        },
      },
      { status: 422 }
    );
  }

  // filter referral
  const referralId = parseId(searchParams.get("referral_id"));
  const referralCode =
    (searchParams.get("referral_code") || "").trim() || undefined;
  const includeReferral = searchParams.get("include_referral") === "1";

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const withDeleted = searchParams.get("with_deleted") === "1";
  const onlyDeleted = searchParams.get("only_deleted") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
  );
  const orderBy = parseSort(searchParams.get("sort"));

  const where = {
    ...(q && {
      OR: [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { whatsapp: { contains: q } },
        { domicile: { contains: q } },
      ],
    }),
    ...(education && { education_last: education }),
    ...(from || to
      ? {
          created_at: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null }),
    ...(assignedTo !== null
      ? { assigned_to: assignedTo }
      : onlyAssigned
      ? { NOT: { assigned_to: null } }
      : includeAssigned
      ? {}
      : { assigned_to: null }),
    ...(referralId !== null ? { referral_id: referralId } : {}),
    ...(referralCode ? { referral: { code: referralCode } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.leads.count({ where }),
    prisma.leads.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
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
                select: {
                  id: true,
                  full_name: true,
                  code: true,
                  status: true,
                  pic_consultant_id: true,
                },
              },
            }
          : {}),
      },
    }),
  ]);

  return json({
    message: "OK",
    data: rows,
    meta: { page, perPage, total },
  });
}

/* =========================
   POST /api/leads (PUBLIC)
   ========================= */
export async function POST(req) {
  const body = await readBody(req);
  const {
    full_name,
    domicile = null,
    whatsapp = null,
    email = null,
    education_last = null,
    assigned_to = null,
    assigned_at = null,
    referral_id: rawReferralId = null,
    referral_code: rawReferralCode = null,
  } = body || {};

  if (
    !full_name ||
    typeof full_name !== "string" ||
    full_name.trim().length < 2
  ) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nama lengkap wajib diisi (min. 2 karakter).",
          field: "full_name",
        },
      },
      { status: 422 }
    );
  }
  if (email && typeof email !== "string") {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Format email tidak valid.",
          field: "email",
          hint: "Pastikan nilai berupa teks/email (contoh: user@domain.com).",
        },
      },
      { status: 422 }
    );
  }

  const assignedToValue = parseId(assigned_to);
  if (assigned_to && assignedToValue === null) {
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

  const assignedAtValue = parseDate(assigned_at);
  if (assigned_at && assignedAtValue === null) {
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

  let referralId = parseId(rawReferralId);
  const referralCode =
    typeof rawReferralCode === "string" ? rawReferralCode.trim() : "";

  try {
    const created = await prisma.$transaction(async (tx) => {
      // resolve referral by code if id not provided
      if (!referralId && referralCode) {
        const ref = await tx.referral.findFirst({
          where: { code: referralCode, deleted_at: null },
          select: { id: true },
        });
        if (!ref) {
          throw Object.assign(new Error("INVALID_REFERRAL_CODE"), {
            status: 422,
          });
        }
        referralId = ref.id;
      }

      const createdLead = await tx.leads.create({
        data: {
          full_name: trimStr(full_name, 150),
          domicile: trimStr(domicile, 150),
          whatsapp: trimStr(whatsapp, 32),
          email: trimStr(email, 191),
          education_last: trimStr(education_last, 64),
          assigned_to: assignedToValue,
          assigned_at: assignedAtValue,
          referral_id: referralId,
        },
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

      if (referralId) {
        await tx.referral.update({
          where: { id: referralId },
          data: { leads_count: { increment: 1 } },
          select: { id: true },
        });
      }

      return createdLead;
    });

    return json(
      { message: "Lead berhasil dibuat.", data: created },
      { status: 201 }
    );
  } catch (e) {
    if (e?.status === 422 && e.message === "INVALID_REFERRAL_CODE") {
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
    console.error("[POST /api/leads] error:", e?.message || e);
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
