// app/api/leads/route.js
import prisma from "@/lib/prisma";
import {
  json,
  badRequest,
  unauthorized,
  forbidden,
  parseDate,
  parseId,
  trimStr,
  parseSort,
  readQuery,
  readBodyFlexible,
  assertAdmin,
  withTs,
  notifyAdminsNewLead,
} from "@/app/api/leads/_utils";
import {
  consumeRateLimitDistributed,
  rateLimitHeaders,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* =========================
   GET /api/leads  (ADMIN)
   ========================= */
export async function GET(req) {
  // auth: NextAuth admin session
  try {
    await assertAdmin(req);
  } catch (err) {
    const status = err?.status || 401;
    if (status === 401)
      return unauthorized("Akses ditolak. Silakan login terlebih dahulu.");
    if (status === 403) return forbidden("Anda tidak memiliki akses.");
    return unauthorized();
  }

  const sp = readQuery(req);
  const q = (sp.get("q") || "").trim();
  const education = sp.get("education") || undefined;

  // assignment filters
  const assignedToRaw = sp.get("assigned_to");
  const assignedTo = parseId(assignedToRaw);
  const onlyAssigned = sp.get("only_assigned") === "1";
  const includeAssigned = sp.get("include_assigned") === "1";
  const wantSummary = sp.get("summary") === "1";

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

  // referral filters
  const referralId = parseId(sp.get("referral_id"));
  const referralCode = (sp.get("referral_code") || "").trim() || undefined;
  const includeReferral = sp.get("include_referral") === "1";

  // date filters
  const from = sp.get("from");
  const to = sp.get("to");

  // soft delete flags
  const withDeleted = sp.get("with_deleted") === "1";
  const onlyDeleted = sp.get("only_deleted") === "1";

  // pagination & sort
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(sp.get("perPage") || "10", 10))
  );
  const orderBy = parseSort(sp.get("sort"));

  // base where (dipakai summary)
  const baseWhere = {
    ...(q && {
      OR: [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { whatsapp: { contains: q } },
        { domicile: { contains: q } },
      ],
    }),
    ...(education ? { education_last: education } : {}),
    ...((from || to) && {
      created_at: {
        ...(from ? { gte: parseDate(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      },
    }),
    ...(onlyDeleted
      ? { NOT: { deleted_at: null } }
      : withDeleted
      ? {}
      : { deleted_at: null }),
    ...(referralId !== null ? { referral_id: referralId } : {}),
    ...(referralCode ? { referral: { code: referralCode } } : {}),
  };

  // list where (hormati filter assignment)
  const listWhere = {
    ...baseWhere,
    ...(assignedTo !== null
      ? { assigned_to: assignedTo }
      : onlyAssigned
      ? { NOT: { assigned_to: null } }
      : includeAssigned
      ? {}
      : { assigned_to: null }),
  };

  // parallel queries
  const tasks = [
    prisma.leads.count({ where: listWhere }),
    prisma.leads.findMany({
      where: listWhere,
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
  ];

  if (wantSummary) {
    tasks.push(
      prisma.leads.count({ where: baseWhere }),
      prisma.leads.count({
        where: { ...baseWhere, NOT: { assigned_to: null } },
      }),
      prisma.leads.count({ where: { ...baseWhere, assigned_to: null } })
    );
  }

  const results = await Promise.all(tasks);
  const total = results[0];
  const rows = results[1];
  const data = rows.map(withTs);

  let summary;
  if (wantSummary) {
    summary = {
      total: results[2] || 0,
      assigned: results[3] || 0,
      unassigned: results[4] || 0,
    };
  }

  return json({
    message: "OK",
    data,
    meta: { page, perPage, total },
    ...(summary ? { summary } : {}),
  });
}

/* =========================
   POST /api/leads (PUBLIC)
   ========================= */
export async function POST(req) {
  const body = await readBodyFlexible(req);

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

  // Honeypot sederhana: field tersembunyi yang seharusnya kosong
  const honeypot =
    body?.hp || body?.honeypot || body?.website || body?.url || "";
  if (honeypot) {
    return json({ message: "OK" }); // balas normal agar bot tidak tahu
  }

  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  const ip = clientIp(req);

  // Rate limit gabungan: per IP + per email untuk mencegah flood bot
  const limits = await Promise.all([
    consumeRateLimitDistributed(`leads:ip:${ip}`, {
      limit: 30,
      windowMs: 60_000,
    }),
    consumeRateLimitDistributed(`leads:email:${emailStr || "none"}`, {
      limit: 10,
      windowMs: 60_000,
    }),
  ]);
  const blocked = limits.find((m) => !m.success);
  if (blocked) {
    return json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Terlalu banyak permintaan. Coba lagi nanti.",
        },
      },
      {
        status: 429,
        headers: rateLimitHeaders(blocked),
      }
    );
  }

  // validations
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
      // resolve code → id bila id kosong
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

      const lead = await tx.leads.create({
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

      return lead;
    });

    // Notifikasi email ke semua admin (best effort, tapi tetap await supaya benar-benar terkirim)
    try {
      await notifyAdminsNewLead(created);
    } catch (err) {
      console.error(
        "[POST /api/leads] notifyAdminsNewLead error:",
        err?.message || err
      );
    }

    return json(
      { message: "Lead berhasil dibuat.", data: withTs(created) },
      { status: 201 }
    );
  } catch (e) {
    if (e?.status === 422 && e?.message === "INVALID_REFERRAL_CODE") {
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
          message: "Terjadi kesalahan di sisi server.",
        },
      },
      { status: 500 }
    );
  }
}
