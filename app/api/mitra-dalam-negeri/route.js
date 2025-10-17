// app/api/mitra-dalam-negeri/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const FALLBACK_LOCALE = EN_LOCALE;
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET;

/* ------------ helpers ------------ */
async function assertAdmin(req) {
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && ADMIN_TEST_KEY && headerKey === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true, email: true },
    });
    if (!anyAdmin) throw new Error("UNAUTHORIZED");
    return { id: anyAdmin.id, email: anyAdmin.email, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email)
    throw new Error("UNAUTHORIZED");
  return session.user;
}

function normalizeLocale(v, f = DEFAULT_LOCALE) {
  return (v || f).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function parseStatusFilter(s) {
  if (!s) return undefined;
  const ALLOWED = new Set(["PENDING", "APPROVED", "DECLINED"]);
  const arr = String(s)
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x) => ALLOWED.has(x));
  return arr.length ? arr : undefined;
}

// form-data / urlencoded / json + ambil file (mendukung multi-attachments)
async function readBodyAndFiles(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  const isAttachKey = (k = "") => {
    const key = String(k).toLowerCase();
    return (
      key === "attachments" ||
      key === "files" ||
      key === "dokumen" ||
      key === "attachment" ||
      key.endsWith("[]") ||
      key.includes("attachment")
    );
  };

  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    let imageFile = null;
    const attachments = [];

    for (const [k, v] of form.entries()) {
      const isFile = typeof File !== "undefined" && v instanceof File;
      if (!isFile) {
        body[k] = v;
        continue;
      }

      // logo / image utama
      if (!imageFile && (k === "image" || k === "logo" || k === "image_file")) {
        imageFile = v;
        continue;
      }

      // multi-attachments
      if (isAttachKey(k)) {
        attachments.push(v);
        continue;
      }

      // fallback: file lain dianggap attachment juga
      attachments.push(v);
    }
    return { body, imageFile, attachments };
  }

  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, imageFile: null, attachments: [] };
}

function safeExt(filename = "") {
  const ext = String(filename).split(".").pop();
  return ext ? `.${ext.toLowerCase()}` : "";
}
function randName(ext = "") {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}
async function uploadToSupabase(
  file,
  prefix,
  { allowedTypes = [], maxMB = 20 } = {}
) {
  if (!file) return null;
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");
  const size = file.size || 0;
  const type = file.type || "application/octet-stream";
  if (size > maxMB * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (allowedTypes.length && type && !allowedTypes.includes(type)) {
    const err = new Error("UNSUPPORTED_TYPE");
    err.meta = { accepted: allowedTypes };
    throw err;
  }
  const ext = safeExt(file.name);
  const objectPath = `${prefix}/${new Date()
    .toISOString()
    .slice(0, 10)}/${randName(ext)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return { path: objectPath, mime: type, size };
}

/* ---------- GET (admin) ---------- */
export async function GET(req) {
  try {
    await assertAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
    );
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const statusFilter = parseStatusFilter(searchParams.get("status"));
    const locale = normalizeLocale(searchParams.get("locale"));
    const fallback = normalizeLocale(
      searchParams.get("fallback") || FALLBACK_LOCALE
    );
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const where = includeDeleted ? {} : { deleted_at: null };
    const and = [];
    if (statusFilter) and.push({ status: { in: statusFilter } });

    if (q) {
      and.push({
        OR: [
          {
            mitra_dalam_negeri_translate: {
              some: {
                locale: { in: locales },
                name: { contains: q, mode: "insensitive" },
              },
            },
          },
          {
            mitra_dalam_negeri_translate: {
              some: {
                locale: { in: locales },
                description: { contains: q, mode: "insensitive" },
              },
            },
          },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
          { province: { contains: q, mode: "insensitive" } },
          { postal_code: { contains: q, mode: "insensitive" } },
          { instagram: { contains: q, mode: "insensitive" } },
          { twitter: { contains: q, mode: "insensitive" } },
          { website: { contains: q, mode: "insensitive" } },
          { contact_name: { contains: q, mode: "insensitive" } },
          { contact_position: { contains: q, mode: "insensitive" } },
          { contact_whatsapp: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;

    where.mitra_dalam_negeri_translate = { some: { locale: { in: locales } } };

    const [total, rows] = await Promise.all([
      prisma.mitra_dalam_negeri.count({ where }),
      prisma.mitra_dalam_negeri.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          admin_user_id: true,
          email: true,
          phone: true,
          website: true,
          instagram: true,
          twitter: true,
          mou_url: true,
          image_url: true,
          address: true,
          city: true,
          province: true,
          postal_code: true,
          contact_name: true,
          contact_position: true,
          contact_whatsapp: true,
          status: true,
          review_notes: true,
          reviewed_at: true,
          reviewed_by: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          mitra_dalam_negeri_translate: {
            where: { locale: { in: locales } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const t = pickTrans(
        row.mitra_dalam_negeri_translate || [],
        locale,
        fallback
      );
      return {
        id: row.id,
        admin_user_id: row.admin_user_id,
        email: row.email,
        phone: row.phone,
        website: row.website,
        instagram: row.instagram,
        twitter: row.twitter,
        mou_url: row.mou_url,
        image_url: row.image_url,
        address: row.address,
        city: row.city,
        province: row.province,
        postal_code: row.postal_code,
        contact_name: row.contact_name,
        contact_position: row.contact_position,
        contact_whatsapp: row.contact_whatsapp,
        status: row.status,
        review_notes: row.review_notes,
        reviewed_at: row.reviewed_at,
        reviewed_by: row.reviewed_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        locale_used: t?.locale || null,
        merchant_name: t?.name || null,
        about: t?.description || null,
      };
    });

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/mitra-dalam-negeri error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ---------- POST (PUBLIC, + upload Supabase) ---------- */
export async function POST(req) {
  try {
    const { body, imageFile, attachments } = await readBodyAndFiles(req);

    const locale = normalizeLocale(body.locale);
    const merchantName = (body?.merchant_name || "").trim();
    const email = (body?.email || "").trim();
    const phone = (body?.phone || "").trim();
    const address = (body?.address || "").trim();

    if (!merchantName)
      return NextResponse.json(
        { message: "merchant_name wajib diisi" },
        { status: 400 }
      );
    if (!email)
      return NextResponse.json(
        { message: "email wajib diisi" },
        { status: 400 }
      );
    if (!phone)
      return NextResponse.json(
        { message: "phone wajib diisi" },
        { status: 400 }
      );
    if (!address)
      return NextResponse.json(
        { message: "address wajib diisi" },
        { status: 400 }
      );

    // === Wajib ada logo/image (either URL atau file)
    let image_url = body.image_url ? String(body.image_url).trim() : null;
    if (!image_url && !imageFile) {
      return NextResponse.json(
        { message: "logo/image wajib diunggah" },
        { status: 400 }
      );
    }

    // === 1) Upload logo lebih dulu (DI LUAR transaksi)
    if (imageFile) {
      try {
        const up = await uploadToSupabase(imageFile, "mitra/images", {
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/svg+xml",
          ],
          maxMB: 10,
        });
        image_url = up?.path ?? image_url;
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return NextResponse.json(
            { message: "Gambar max 10MB" },
            { status: 413 }
          );
        if (e?.message === "UNSUPPORTED_TYPE")
          return NextResponse.json(
            { message: "Gambar harus JPEG/PNG/WebP/SVG" },
            { status: 415 }
          );
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return NextResponse.json(
            { message: "Bucket belum diset" },
            { status: 500 }
          );
        console.error("upload image error:", e);
        return NextResponse.json(
          { message: "Upload gambar gagal" },
          { status: 500 }
        );
      }
    }

    // === 2) Siapkan terjemahan (DI LUAR transaksi)
    const aboutRaw =
      body.about !== undefined && body.about !== null
        ? String(body.about)
        : null;

    let nameEn = null;
    let aboutEn = null;
    if (locale !== EN_LOCALE) {
      const [nEn, aEn] = await Promise.all([
        merchantName
          ? translate(merchantName, locale, EN_LOCALE).catch(() => merchantName)
          : Promise.resolve(merchantName),
        aboutRaw
          ? translate(aboutRaw, locale, EN_LOCALE).catch(() => aboutRaw)
          : Promise.resolve(aboutRaw),
      ]);
      nameEn = nEn || merchantName;
      aboutEn = aEn ?? aboutRaw;
    }

    // === 3) Transaksi SINGKAT (DB only)
    const created = await prisma.$transaction(
      async (tx) => {
        const mitra = await tx.mitra_dalam_negeri.create({
          data: {
            // org info
            email,
            phone,
            website: body.website ? String(body.website).trim() : null,
            instagram: body.instagram ? String(body.instagram).trim() : null,
            twitter: body.twitter ? String(body.twitter).trim() : null,
            mou_url: body.mou_url ? String(body.mou_url).trim() : null,
            image_url,

            // address
            address,
            city: body.city ? String(body.city).trim() : null,
            province: body.province ? String(body.province).trim() : null,
            postal_code: body.postal_code
              ? String(body.postal_code).trim()
              : null,

            // contact person
            contact_name: body.contact_name
              ? String(body.contact_name).trim()
              : null,
            contact_position: body.contact_position
              ? String(body.contact_position).trim()
              : null,
            contact_whatsapp: body.contact_whatsapp
              ? String(body.contact_whatsapp).trim()
              : null,

            // workflow
            status: "PENDING",
            review_notes: null,
            reviewed_by: null,
            reviewed_at: null,

            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // translasi utama (locale user)
        await tx.mitra_dalam_negeri_translate.create({
          data: {
            id_merchants: mitra.id,
            locale,
            name: merchantName,
            description: aboutRaw,
          },
        });

        // translasi EN (kalau perlu)
        if (locale !== EN_LOCALE) {
          await tx.mitra_dalam_negeri_translate.upsert({
            where: {
              id_merchants_locale: {
                id_merchants: mitra.id,
                locale: EN_LOCALE,
              },
            },
            update: {
              ...(nameEn ? { name: nameEn } : {}),
              ...(aboutEn !== undefined
                ? { description: aboutEn ?? null }
                : {}),
            },
            create: {
              id_merchants: mitra.id,
              locale: EN_LOCALE,
              name: nameEn || merchantName,
              description: aboutEn ?? aboutRaw,
            },
          });
        }

        return mitra;
      },
      // opsi (boleh dihapus jika tidak perlu)
      { timeout: 15000, maxWait: 5000 }
    );

    // === 4) Upload ATTACHMENTS (DI LUAR transaksi)
    let uploaded = [];
    if (attachments?.length) {
      for (const f of attachments) {
        try {
          const up = await uploadToSupabase(f, `mitra/files/${created.id}`, {
            allowedTypes: [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.ms-powerpoint",
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/svg+xml",
              "text/plain",
            ],
            maxMB: 20,
          });
          if (up?.path) uploaded.push(up.path);
        } catch (e) {
          console.error("upload attachment error:", e?.message || e);
          // lanjutkan file lain; jangan batalkan seluruh request
        }
      }
    }

    // === 5) Simpan metadata lampiran (sekali jalan)
    if (uploaded.length) {
      try {
        const agg = await prisma.mitra_files.aggregate({
          where: { mitra_id: created.id },
          _max: { sort: true },
        });
        const startSort = agg?._max?.sort ?? 0;

        const rows = uploaded.map((p, i) => ({
          mitra_id: created.id,
          file_url: p,
          sort: startSort + i + 1,
        }));

        await prisma.mitra_files.createMany({
          data: rows,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error("save attachment meta error:", e?.message || e);
      }
    }

    return NextResponse.json(
      {
        id: created.id,
        status: "PENDING",
        message: "Terima kasih! Pengajuan Anda akan direview.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/mitra-dalam-negeri error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
