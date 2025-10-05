// app/api/programs/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Helpers ========= */
const PROGRAM_TYPE_VALUES = new Set(["B2B", "B2C"]);
const PROGRAM_CATEGORY_VALUES = new Set([
  "STUDY_ABROAD",
  "WORK_ABROAD",
  "LANGUAGE_COURSE",
  "CONSULTANT_VISA",
]);

function parseBool(v) {
  if (v === undefined || v === null) return undefined;
  return v === true || v === "true" || v === "1";
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function getOrderBy(param) {
  const allowed = new Set(["created_at", "updated_at", "price"]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
async function getAdminUserId(req, body) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return req.headers.get("x-admin-user-id") || body?.admin_user_id || null;
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
function pickTrans(trans, primary, fallback) {
  const by = (loc) => trans?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function ensureProgramType(v) {
  const val = String(v || "")
    .trim()
    .toUpperCase();
  if (!PROGRAM_TYPE_VALUES.has(val)) {
    throw new Error("program_type harus 'B2B' atau 'B2C'");
  }
  return val;
}
function ensureProgramCategory(v, allowNull = true) {
  if (v == null || v === "") return allowNull ? null : undefined;
  const val = String(v).trim().toUpperCase();
  if (!PROGRAM_CATEGORY_VALUES.has(val)) {
    throw new Error(
      "program_category tidak valid (STUDY_ABROAD|WORK_ABROAD|LANGUAGE_COURSE|CONSULTANT_VISA)"
    );
  }
  return val;
}

const BUCKET = process.env.SUPABASE_BUCKET;

function isHttpUrl(path) {
  return typeof path === "string" && /^https?:\/\//i.test(path);
}

function getPublicUrl(path) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  if (!BUCKET) return path;
  const { data, error } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (error) {
    console.error("supabase getPublicUrl error:", error);
    return null;
  }
  return data?.publicUrl || null;
}

async function uploadProgramImage(file) {
  if (typeof File === "undefined" || !(file instanceof File)) {
    throw new Error("NO_FILE");
  }
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const MAX = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const size = file.size || 0;
  const type = file.type || "";

  if (size > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `programs/${new Date().toISOString().slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath;
}

/* ========= GET /api/programs (LIST) =========
Query:
- q
- program_type = B2B|B2C
- program_category = STUDY_ABROAD|WORK_ABROAD|LANGUAGE_COURSE|CONSULTANT_VISA
- published = true|false
- page, perPage, sort = (created_at|updated_at|price):(asc|desc)
- locale (default id), fallback (default id)
*/
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const program_type = searchParams.get("program_type") || undefined;
    const program_category = searchParams.get("program_category") || undefined;
    const published = parseBool(searchParams.get("published"));
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 10))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));

    const locale = (searchParams.get("locale") || "id").toLowerCase();
    const fallback = (searchParams.get("fallback") || "id").toLowerCase();

    const typeFilter =
      program_type && PROGRAM_TYPE_VALUES.has(program_type.toUpperCase())
        ? program_type.toUpperCase()
        : undefined;
    const categoryFilter =
      program_category &&
      PROGRAM_CATEGORY_VALUES.has(program_category.toUpperCase())
        ? program_category.toUpperCase()
        : undefined;

    const where = {
      deleted_at: null,
      ...(typeFilter ? { program_type: typeFilter } : {}),
      ...(categoryFilter ? { program_category: categoryFilter } : {}),
      ...(published !== undefined ? { is_published: published } : {}),
      ...(q
        ? {
            programs_translate: {
              some: {
                locale: { in: [locale, fallback] },
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                ],
              },
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.programs.findMany({
        where,
        orderBy,
        take: perPage,
        skip: (page - 1) * perPage,
        select: {
          id: true,
          admin_user_id: true,
          image_url: true,
          program_type: true,
          program_category: true,
          price: true,
          phone: true,
          is_published: true,
          created_at: true,
          updated_at: true,
          programs_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
      prisma.programs.count({ where }),
    ]);

    const items = rows.map((p) => {
      const t = pickTrans(p.programs_translate, locale, fallback);
      const image_public_url = getPublicUrl(p.image_url);
      return {
        id: p.id,
        admin_user_id: p.admin_user_id,
        image_url: p.image_url,
        image_public_url,
        program_type: p.program_type,
        program_category: p.program_category,
        price: p.price,
        phone: p.phone,
        is_published: p.is_published,
        created_at: p.created_at,
        updated_at: p.updated_at,
        locale_used: t?.locale || null,
        name: t?.name || null,
        description: t?.description || null,
      };
    });

    return NextResponse.json({
      data: items,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        locale,
        fallback,
      },
    });
  } catch (err) {
    console.error("GET /api/programs error:", err);
    return NextResponse.json(
      { message: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/programs (CREATE + auto-translate) =========
Body / FormData:
- admin_user_id? (auto dari session jika ada)
- file? (image upload)
- image_url? (optional, dipakai jika tidak ada file)
- program_type        : 'B2B' | 'B2C'                (required)
- program_category    : 'STUDY_ABROAD' | 'WORK_ABROAD' | 'LANGUAGE_COURSE' | 'CONSULTANT_VISA' (optional)
- price? (int >= 0), phone?, is_published?
- name_id (required), description_id?
- name_en?, description_en?, autoTranslate?=true
*/
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let uploadFile = null;
    let adminPayload = {};
    let programTypeInput;
    let programCategoryInput;
    let priceInput;
    let phoneInput;
    let isPublishedInput;

    let imagePath = "";
    let name_id = "";
    let description_id = null;
    let name_en = "";
    let description_en = "";
    let autoTranslate = true;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      uploadFile = form.get("file");

      imagePath = String(form.get("image_url") || "").trim();
      name_id = String(form.get("name_id") ?? form.get("name") ?? "").trim();

      if (form.has("description_id")) {
        const v = form.get("description_id");
        description_id = v === null ? null : String(v);
      } else if (form.has("description")) {
        const v = form.get("description");
        description_id = v === null ? null : String(v);
      }

      name_en = String(form.get("name_en") || "").trim();
      const descEnForm = form.get("description_en");
      description_en =
        descEnForm === null || descEnForm === undefined
          ? ""
          : String(descEnForm).trim();

      autoTranslate =
        String(form.get("autoTranslate") ?? "true").toLowerCase() !== "false";

      programTypeInput = form.get("program_type");
      programCategoryInput = form.get("program_category");
      priceInput = form.get("price");
      phoneInput = form.get("phone");
      isPublishedInput = form.get("is_published");

      const adminId = form.get("admin_user_id");
      if (adminId !== null && adminId !== undefined) {
        adminPayload.admin_user_id = adminId;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      adminPayload = body;

      imagePath = String(body?.image_url || "").trim();
      name_id = String(body?.name_id ?? body?.name ?? "").trim();

      if (body?.description_id !== undefined) {
        description_id =
          body.description_id === null ? null : String(body.description_id);
      } else if (body?.description !== undefined) {
        description_id =
          body.description === null ? null : String(body.description);
      }

      name_en = String(body?.name_en || "").trim();
      description_en =
        body?.description_en === null || body?.description_en === undefined
          ? ""
          : String(body.description_en).trim();

      autoTranslate =
        String(body?.autoTranslate ?? "true").toLowerCase() !== "false";

      programTypeInput = body?.program_type;
      programCategoryInput = body?.program_category;
      priceInput = body?.price;
      phoneInput = body?.phone;
      isPublishedInput = body?.is_published;
    }

    if (!name_id) {
      return badRequest("name_id (Bahasa Indonesia) wajib diisi");
    }

    let program_type;
    try {
      program_type = ensureProgramType(programTypeInput);
    } catch (e) {
      return badRequest(e.message);
    }

    let program_category = null;
    try {
      program_category = ensureProgramCategory(programCategoryInput, true);
    } catch (e) {
      return badRequest(e.message);
    }

    const price =
      priceInput === null || priceInput === undefined || priceInput === ""
        ? null
        : asInt(priceInput, NaN);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return badRequest("price harus bilangan bulat >= 0");
    }

    const adminUserId = await getAdminUserId(req, adminPayload);
    if (!adminUserId) {
      return NextResponse.json(
        {
          message:
            "admin_user_id tidak ditemukan (pastikan sudah login & session.user.id tersedia)",
        },
        { status: 401 }
      );
    }

    if (uploadFile && typeof uploadFile !== "string") {
      try {
        imagePath = await uploadProgramImage(uploadFile);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return NextResponse.json({ message: "Maksimal 10MB" }, { status: 413 });
        if (e?.message === "UNSUPPORTED_TYPE")
          return NextResponse.json(
            { message: "Format harus JPEG/PNG/WebP" },
            { status: 415 }
          );
        console.error("uploadProgramImage error:", e);
        return NextResponse.json(
          { message: "Upload gambar gagal" },
          { status: 500 }
        );
      }
    }

    const storedImage = imagePath && imagePath.trim() ? imagePath.trim() : null;
    const phone =
      phoneInput === null || phoneInput === undefined
        ? null
        : String(phoneInput).trim() || null;
    const publishFlag = parseBool(isPublishedInput);
    const is_published = publishFlag === undefined ? false : publishFlag;

    const descriptionIdValue =
      typeof description_id === "string" && description_id.trim() === ""
        ? null
        : description_id ?? null;

    let nameEnValue = name_en.trim();
    let descriptionEnValue = description_en.trim();

    if (autoTranslate) {
      if (!nameEnValue && name_id) {
        nameEnValue = await translate(name_id, "id", "en");
      }
      if (!descriptionEnValue && descriptionIdValue) {
        descriptionEnValue = await translate(descriptionIdValue, "id", "en");
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const program = await tx.programs.create({
        data: {
          id: randomUUID(),
          admin_user_id: adminUserId,
          image_url: storedImage,
          program_type,
          program_category,
          price,
          phone,
          is_published,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });

      await tx.programs_translate.create({
        data: {
          id_programs: program.id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: descriptionIdValue,
        },
      });

      if (nameEnValue || descriptionEnValue) {
        await tx.programs_translate.create({
          data: {
            id_programs: program.id,
            locale: "en",
            name: (nameEnValue || "(no title)").slice(0, 191),
            description: descriptionEnValue || null,
          },
        });
      }

      return program;
    });

    const image_public_url = getPublicUrl(storedImage);

    return NextResponse.json(
      {
        data: {
          id: created.id,
          image_url: storedImage,
          image_public_url,
          program_type,
          program_category,
          price,
          phone,
          is_published,
          name_id,
          description_id: descriptionIdValue,
          name_en: nameEnValue || null,
          description_en: descriptionEnValue || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/programs error:", err);
    if (err?.message === "SUPABASE_BUCKET_NOT_CONFIGURED") {
      return NextResponse.json(
        { message: "Supabase bucket belum dikonfigurasi" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "Failed to create program" },
      { status: 500 }
    );
  }
}
