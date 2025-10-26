// app/api/referral/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPhoneNumber } from "@/app/utils/watzap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENDERS = ["MALE", "FEMALE"];
const STATUSES = ["PENDING", "REJECTED", "VERIFIED"];

const json = (b, i) => NextResponse.json(sanitize(b), i);
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
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}

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

async function uploadFrontToSupabase(file, nik) {
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `referral/${nik}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return objectPath;
}
function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(path);
  return data?.publicUrl || null;
}

/* ==================== GET (ADMIN LIST) ==================== */
export async function GET(req) {
  try {
    await requireAdmin(); // admin-only
  } catch (err) {
    return json(
      { error: { code: err?.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
      { status: err?.status === 401 ? 401 : 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("perPage") || "10", 10))
    );
    const q = (url.searchParams.get("q") || "").trim();
    const statusRaw = (url.searchParams.get("status") || "").toUpperCase();

    const where = { deleted_at: null };
    if (q) {
      where.OR = [
        { nik: { contains: q } },
        { full_name: { contains: q } },
        { email: { contains: q } },
        { whatsapp: { contains: q } },
        { code: { contains: q } },
        { city: { contains: q } },
        { province: { contains: q } },
      ];
    }
    if (STATUSES.includes(statusRaw)) where.status = statusRaw;

    const [total, data] = await Promise.all([
      prisma.referral.count({ where }),
      prisma.referral.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          nik: true,
          full_name: true,
          email: true,
          whatsapp: true,
          whatsapp_e164: true,
          gender: true,
          status: true,
          code: true,
          pic_consultant_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          leads_count: true,
        },
      }),
    ]);

    return json({
      data: data.map(withTs),
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  } catch (e) {
    console.error("GET /api/referral error:", e);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

/* ==================== POST (PUBLIC CREATE) ==================== */
export async function POST(req) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Use multipart/form-data",
        },
      },
      { status: 415 }
    );
  }

  const form = await req.formData();

  // --- required sesuai form user ---
  const nik = trimStr(form.get("nik"), 16);
  const full_name = trimStr(form.get("full_name"), 150);
  const date_of_birth = parseDate(form.get("date_of_birth"));
  const gender = pickEnum(form.get("gender"), GENDERS);

  const address_line = trimStr(form.get("address_line"), 191);
  const rt = trimStr(form.get("rt"), 3);
  const rw = trimStr(form.get("rw"), 3);
  const kelurahan = trimStr(form.get("kelurahan"), 64);
  const kecamatan = trimStr(form.get("kecamatan"), 64);
  const city = trimStr(form.get("city"), 64);
  const province = trimStr(form.get("province"), 64);
  const postal_code = trimStr(form.get("postal_code"), 10);

  const whatsapp = trimStr(form.get("whatsapp"), 32);
  const email = trimStr(form.get("email"), 191);

  const pic_consultant_id = trimStr(form.get("pic_consultant_id"), 36);
  const consent_agreed = String(form.get("consent_agreed")) === "true";

  // --- validate required ---
  if (!nik || nik.length !== 16)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "NIK harus 16 digit" } },
      { status: 422 }
    );
  if (!full_name || full_name.length < 2)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nama lengkap wajib diisi (min 2 karakter)",
        },
      },
      { status: 422 }
    );
  if (!date_of_birth)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Tanggal lahir wajib (format YYYY-MM-DD)",
        },
      },
      { status: 422 }
    );
  if (!gender)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Jenis kelamin wajib (MALE/FEMALE)",
        },
      },
      { status: 422 }
    );

  if (!address_line)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Alamat wajib" } },
      { status: 422 }
    );
  if (!rt)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "RT wajib" } },
      { status: 422 }
    );
  if (!rw)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "RW wajib" } },
      { status: 422 }
    );
  if (!kelurahan)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Kelurahan wajib" } },
      { status: 422 }
    );
  if (!kecamatan)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Kecamatan wajib" } },
      { status: 422 }
    );
  if (!city)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Kota/Kabupaten wajib" } },
      { status: 422 }
    );
  if (!province)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Provinsi wajib" } },
      { status: 422 }
    );
  if (!postal_code)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Kode pos wajib" } },
      { status: 422 }
    );

  if (!whatsapp)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nomor WhatsApp wajib diisi",
        },
      },
      { status: 422 }
    );
  if (!email)
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Email wajib diisi" } },
      { status: 422 }
    );

  if (!pic_consultant_id)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "PIC Konsultan wajib dipilih",
        },
      },
      { status: 422 }
    );
  if (!consent_agreed)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Harus menyetujui S&K / Kebijakan Privasi",
        },
      },
      { status: 422 }
    );

  // --- KTP image required ---
  const front = form.get("front");
  if (!(front instanceof File)) {
    return json(
      {
        error: { code: "VALIDATION_ERROR", message: "Foto KTP wajib diunggah" },
      },
      { status: 422 }
    );
  }
  const MAX = 5 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if ((front.size || 0) > MAX)
    return json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Maksimal 5MB" } },
      { status: 413 }
    );
  if (!allowed.includes(front.type))
    return json(
      {
        error: {
          code: "UNSUPPORTED_TYPE",
          message: "Format gambar harus JPEG/PNG/WebP",
        },
      },
      { status: 415 }
    );

  try {
    // PIC must exist
    const pic = await prisma.consultants.findUnique({
      where: { id: pic_consultant_id },
      select: { id: true },
    });
    if (!pic) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "PIC Konsultan tidak ditemukan",
          },
        },
        { status: 422 }
      );
    }

    const front_url = await uploadFrontToSupabase(front, nik);
    const whatsapp_e164 = formatPhoneNumber(whatsapp) || null;

    const created = await prisma.referral.create({
      data: {
        nik,
        full_name,
        date_of_birth,
        gender,
        address_line,
        rt,
        rw,
        kelurahan,
        kecamatan,
        city,
        province,
        postal_code,

        whatsapp,
        whatsapp_e164,
        email,

        consent_agreed: true,
        domicile: trimStr(form.get("domicile"), 100) ?? null,
        front_url,
        status: "PENDING",
        pic_consultant_id,
        code: null,
      },
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
      },
    });

    const public_front = getPublicUrl(created.front_url);
    return json(
      { data: withTs(created), preview: { front: public_front } },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "NIK atau data unik sudah terdaftar",
          },
        },
        { status: 409 }
      );
    }
    console.error("POST /api/referral error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
