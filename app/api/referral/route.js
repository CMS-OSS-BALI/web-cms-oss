// app/api/referral/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { formatPhoneNumber } from "@/app/utils/watzap";
import storageClient from "@/app/utils/storageClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Constants & Config
========================= */
const GENDERS = ["MALE", "FEMALE"];
const STATUSES = ["PENDING", "REJECTED", "VERIFIED"];

const PUBLIC_PREFIX = "cms-oss";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

/* =========================
   Public URL helpers
========================= */
function computePublicBase() {
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base;
  }
}

function ensurePrefixedKey(key) {
  const clean = String(key || "").replace(/^\/+/, "");
  return clean.startsWith(PUBLIC_PREFIX + "/")
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
}

function toPublicUrl(keyOrUrl) {
  if (!keyOrUrl) return null;
  const s = String(keyOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const cdn = computePublicBase();
  const path = ensurePrefixedKey(s);
  const base =
    cdn || (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return `/${path}`;
  return `${base}/public/${path}`;
}

/* =========================
   Storage cleanup helpers
========================= */
function toStorageKey(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) {
    return s.replace(/^\/+/, "");
  }
  const idx = s.indexOf("/public/");
  if (idx >= 0) {
    return s.slice(idx + "/public/".length).replace(/^\/+/, "");
  }
  return null;
}

async function removeStorageObjects(urlsOrKeys = []) {
  const keys = urlsOrKeys.map(toStorageKey).filter(Boolean);
  if (!keys.length) return;
  const base = (process.env.OSS_STORAGE_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return;

  try {
    const res = await fetch(`${base}/api/storage/remove`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
      },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) {
      await fetch(`${base}/api/storage/delete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.OSS_STORAGE_API_KEY || "",
        },
        body: JSON.stringify({ keys }),
      }).catch(() => {});
    }
  } catch (_) {}
}

/* =========================
   JSON & Auth helpers
========================= */
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

/* =========================
   Misc helpers
========================= */
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

/* =========================
   Upload helpers (OSS)
========================= */
async function assertImageFileOrThrow(file) {
  const type = file?.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(type)) throw new Error("UNSUPPORTED_TYPE");
  const size =
    typeof file?.size === "number"
      ? file.size
      : (await file.arrayBuffer()).byteLength;
  if (size > MAX_UPLOAD_SIZE) throw new Error("PAYLOAD_TOO_LARGE");
}

/** Upload foto KTP depan ke OSS Storage, return public URL */
async function uploadReferralFront(file, nik) {
  await assertImageFileOrThrow(file);
  const res = await storageClient.uploadBufferWithPresign(file, {
    folder: `${PUBLIC_PREFIX}/referral/${nik}`,
    isPublic: true,
  });
  return res.publicUrl || null;
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
        { pekerjaan: { contains: q } },
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
          pekerjaan: true,
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

  const pekerjaan = trimStr(form.get("pekerjaan"), 100) ?? null; // wajib

  const whatsapp = trimStr(form.get("whatsapp"), 32);
  const email = trimStr(form.get("email"), 191);

  const pic_consultant_id_raw = trimStr(form.get("pic_consultant_id"), 36); // opsional
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

  if (!pekerjaan || pekerjaan.length < 2)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Pekerjaan wajib diisi (min 2 karakter)",
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

  // --- Kartu Identitas (foto) required ---
  const front = form.get("front");
  if (!(front instanceof File)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Foto Kartu Identitas wajib diunggah",
        },
      },
      { status: 422 }
    );
  }
  // Validasi ulang sesuai ALLOWED_IMAGE_TYPES & MAX_UPLOAD_SIZE
  try {
    await assertImageFileOrThrow(front);
  } catch (e) {
    if (e?.message === "PAYLOAD_TOO_LARGE")
      return json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: "Maksimal 5MB" } },
        { status: 413 }
      );
    if (e?.message === "UNSUPPORTED_TYPE")
      return json(
        {
          error: { code: "UNSUPPORTED_TYPE", message: "Harus JPEG/PNG/WebP" },
        },
        { status: 415 }
      );
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }

  try {
    // PIC opsional: cek hanya jika ada
    let pic_consultant_id = null;
    if (pic_consultant_id_raw) {
      const pic = await prisma.consultants.findUnique({
        where: { id: pic_consultant_id_raw },
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
      pic_consultant_id = pic_consultant_id_raw;
    }

    // Upload ke OSS Storage (return public URL)
    const front_url = await uploadReferralFront(front, nik);
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

        pekerjaan, // wajib

        whatsapp,
        whatsapp_e164,
        email,

        consent_agreed: true,
        domicile: trimStr(form.get("domicile"), 100) ?? null,
        front_url, // sudah public URL
        status: "PENDING",
        pic_consultant_id, // boleh null
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
        pekerjaan: true,
      },
    });

    return json(
      {
        data: withTs(created),
        preview: { front: toPublicUrl(created.front_url) },
      },
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
