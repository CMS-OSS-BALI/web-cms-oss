// app/api/referral/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPhoneNumber } from "@/app/utils/watzap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========== helpers ========== */
const GENDERS = ["MALE", "FEMALE", "UNKNOWN"];

const json = (b, i) => NextResponse.json(sanitizeBigInt(b), i);
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

function sanitizeBigInt(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(sanitizeBigInt);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeBigInt(v);
    return out;
  }
  return value;
}

async function uploadFrontToSupabase(file, nik) {
  const bucket = process.env.SUPABASE_BUCKET;
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `referral/${nik}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath; // store path, not URL
}

// === NEW: getPublicUrl (no expiry) ===
function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(path);
  return data?.publicUrl || null;
}

/* ========== POST /api/referral ========== */
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

  // Required (per schema)
  const nik = trimStr(form.get("nik"), 16);
  const full_name = trimStr(form.get("full_name"), 150);
  const email = trimStr(form.get("email"), 191);
  const whatsapp = trimStr(form.get("whatsapp"), 32);
  const gender = pickEnum(form.get("gender"), GENDERS);
  const consent_agreed = String(form.get("consent_agreed")) === "true";

  if (!nik || nik.length !== 16) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "NIK harus 16 digit" } },
      { status: 422 }
    );
  }
  if (!full_name || full_name.length < 2) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nama lengkap wajib diisi (min 2 karakter)",
        },
      },
      { status: 422 }
    );
  }
  if (!email) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Email wajib diisi" } },
      { status: 422 }
    );
  }
  if (!whatsapp) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nomor WhatsApp wajib diisi",
        },
      },
      { status: 422 }
    );
  }
  if (!gender) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Jenis kelamin wajib dipilih",
        },
      },
      { status: 422 }
    );
  }
  if (!consent_agreed) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Harus menyetujui S&K / Kebijakan Privasi",
        },
      },
      { status: 422 }
    );
  }

  const whatsapp_e164 = formatPhoneNumber(whatsapp) || null;

  // KTP image (required)
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
  if ((front.size || 0) > MAX) {
    return json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Maksimal 5MB" } },
      { status: 413 }
    );
  }
  if (!allowed.includes(front.type)) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_TYPE",
          message: "Format gambar harus JPEG/PNG/WebP",
        },
      },
      { status: 415 }
    );
  }

  // Optional (per schema)
  const payload = {
    date_of_birth: parseDate(form.get("date_of_birth")), // optional
    address_line: trimStr(form.get("address_line"), 191),
    rt: trimStr(form.get("rt"), 3),
    rw: trimStr(form.get("rw"), 3),
    kelurahan: trimStr(form.get("kelurahan"), 64),
    kecamatan: trimStr(form.get("kecamatan"), 64),
    city: trimStr(form.get("city"), 64),
    province: trimStr(form.get("province"), 64),
    postal_code: trimStr(form.get("postal_code"), 10),
    domicile: trimStr(form.get("domicile"), 100),
  };

  try {
    // Upload image → Supabase (store PATH)
    const front_url = await uploadFrontToSupabase(front, nik);

    // Save to DB
    const created = await prisma.referral.create({
      data: {
        nik,
        full_name,
        email,
        whatsapp,
        whatsapp_e164,
        gender,
        consent_agreed: true,
        front_url, // PATH
        status: "PENDING",
        ...payload,
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
        front_url: true, // PATH
        created_at: true,
      },
    });

    // public URL (no expiry) for immediate preview
    const public_front = getPublicUrl(created.front_url);

    return json(
      { data: created, preview: { front: public_front } },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === "P2002") {
      return json(
        { error: { code: "CONFLICT", message: "NIK sudah terdaftar" } },
        { status: 409 }
      );
    }
    console.error("POST /api/referral error:", err);
    return json({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
