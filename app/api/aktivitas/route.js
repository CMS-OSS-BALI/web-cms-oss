// app/api/aktivitas/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* -------------------- config & constants -------------------- */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LOCALE = "id";
const EN_LOCALE = "en";
const BUCKET = process.env.SUPABASE_BUCKET;
const SUPA_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || ""; // optional: bypass next-auth via header untuk Postman

/* -------------------- utils -------------------- */
function sanitize(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = sanitize(val);
    return o;
  }
  return v;
}
function json(data, init) {
  return NextResponse.json(sanitize(data), init);
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function toBool(v, dflt = null) {
  if (v === null || v === undefined || v === "") return dflt;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return dflt;
}
function normalizeLocale(value, fallback = DEFAULT_LOCALE) {
  return (value || fallback).toLowerCase().slice(0, 5);
}
function pickTrans(
  list = [],
  primary = DEFAULT_LOCALE,
  fallback = DEFAULT_LOCALE
) {
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
function getOrderBy(param) {
  const allowed = new Set(["sort", "created_at", "updated_at"]);
  const [field = "sort", dir = "asc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "sort";
  const order = String(dir).toLowerCase() === "desc" ? "desc" : "asc";
  return [{ [key]: order }, { created_at: "desc" }];
}
/** convert storage path → public URL */
function toPublicUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPA_URL || !BUCKET) return path;
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
/** ms helper */
const toMs = (d) => {
  if (!d) return null;
  try {
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
};

/** Accept NextAuth session OR x-admin-key header (for Postman) */
async function assertAdmin(req) {
  const key = req.headers.get("x-admin-key");
  if (key && ADMIN_TEST_KEY && key === ADMIN_TEST_KEY) {
    const anyAdmin = await prisma.admin_users.findFirst({
      select: { id: true },
    });
    if (!anyAdmin) throw new Response("Forbidden", { status: 403 });
    return { adminId: anyAdmin.id, via: "header" };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { adminId: admin.id, via: "session" };
}

/** Read JSON atau multipart form-data (returns { body, file }) */
async function readBodyAndFile(req) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = contentType.startsWith("multipart/form-data");
  const isUrlEncoded = contentType.startsWith(
    "application/x-www-form-urlencoded"
  );

  if (isMultipart || isUrlEncoded) {
    const form = await req.formData();
    const body = {};
    let file = null;

    // TERIMA file di key: image / file / image_file / image_url
    const tryKeys = ["image", "file", "image_file", "image_url"];
    for (const k of tryKeys) {
      const f = form.get(k);
      if (f && typeof File !== "undefined" && f instanceof File) {
        file = f;
        break;
      }
    }
    for (const [k, v] of form.entries()) {
      if (v instanceof File) continue;
      body[k] = v;
    }
    return { body, file };
  }

  const body = (await req.json().catch(() => ({}))) ?? {};
  return { body, file: null };
}

/** Upload image ke Supabase Storage (opsional) */
async function uploadAktivitasImage(file) {
  if (!file) return null;
  if (!BUCKET) throw new Error("SUPABASE_BUCKET_NOT_CONFIGURED");

  const size = file.size || 0;
  const type = file.type || "";
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (size > 10 * 1024 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  if (type && !allowed.includes(type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `aktivitas/${new Date()
    .toISOString()
    .slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(error.message);

  return objectPath; // simpan di DB sebagai image_url (path)
}

/* -------------------- GET (list) -------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = normalizeLocale(
      searchParams.get("locale") || DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      searchParams.get("fallback") || DEFAULT_LOCALE
    );
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";
    const is_published = toBool(searchParams.get("is_published"), null);

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(is_published === null ? {} : { is_published }),
      ...(q
        ? {
            translate: {
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

    const [total, rows] = await Promise.all([
      prisma.aktivitas.count({ where }),
      prisma.aktivitas.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          translate: {
            where: { locale: { in: [locale, fallback] } },
            select: { locale: true, name: true, description: true },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const t = pickTrans(r.translate, locale, fallback);
      const created_ts = r?.created_at
        ? new Date(r.created_at).getTime()
        : null;
      const updated_ts = r?.updated_at
        ? new Date(r.updated_at).getTime()
        : null;
      const deleted_at_ts = r?.deleted_at
        ? new Date(r.deleted_at).getTime()
        : null;
      return {
        id: r.id,
        image_url: toPublicUrl(r.image_url),
        sort: r.sort,
        is_published: r.is_published,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        created_ts,
        updated_ts,
        deleted_at_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      };
    });

    return json({
      message: "OK",
      data,
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
    console.error("GET /api/aktivitas error:", err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat daftar aktivitas.",
        },
      },
      { status: 500 }
    );
  }
}

/* -------------------- POST (create, admin) -------------------- */
export async function POST(req) {
  try {
    const { adminId } = await assertAdmin(req);

    const { body, file } = await readBodyAndFile(req);

    let image_url = "";
    if (file) {
      try {
        image_url = await uploadAktivitasImage(file);
      } catch (e) {
        if (e?.message === "PAYLOAD_TOO_LARGE")
          return json({ message: "Gambar max 10MB" }, { status: 413 });
        if (e?.message === "UNSUPPORTED_TYPE")
          return json(
            { message: "Gambar harus JPEG/PNG/WebP" },
            { status: 415 }
          );
        if (e?.message === "SUPABASE_BUCKET_NOT_CONFIGURED")
          return json(
            { message: "Supabase bucket belum disetel" },
            { status: 500 }
          );
        console.error("uploadAktivitasImage error:", e);
        return json({ message: "Upload gambar gagal" }, { status: 500 });
      }
    } else {
      image_url = String(body?.image_url || "").trim();
    }

    const name_id = String(body?.name_id ?? body?.name ?? "").trim();
    const description_id =
      body?.description_id !== undefined
        ? String(body.description_id)
        : body?.description !== undefined
        ? String(body.description)
        : null;

    if (!image_url)
      return json(
        { message: "image_url atau file gambar wajib" },
        { status: 400 }
      );
    if (!name_id)
      return json({ message: "name_id (judul ID) wajib" }, { status: 400 });

    const sort = asInt(body?.sort, 0);
    const is_published = toBool(body?.is_published, false) ?? false;

    let name_en = String(body?.name_en || "").trim();
    let description_en =
      body?.description_en !== undefined && body?.description_en !== null
        ? String(body.description_en)
        : "";

    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";
    if (autoTranslate) {
      if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
      if (!description_en && description_id)
        description_en = await translate(description_id, "id", "en");
    }

    const id = randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.aktivitas.create({
        data: {
          id,
          admin_user_id: adminId,
          image_url,
          sort,
          is_published,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await tx.aktivitas_translate.create({
        data: {
          id_aktivitas: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id ?? null,
        },
      });

      if (name_en || description_en) {
        await tx.aktivitas_translate.create({
          data: {
            id_aktivitas: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    return json(
      {
        message: "Aktivitas berhasil dibuat.",
        data: {
          id: created.id,
          image_url: toPublicUrl(created.image_url || image_url),
          sort,
          is_published,
          created_at: created.created_at,
          updated_at: created.updated_at,
          deleted_at: created.deleted_at ?? null,
          created_ts: toMs(created.created_at),
          updated_ts: toMs(created.updated_at),
          deleted_at_ts: toMs(created.deleted_at),
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/aktivitas error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Terjadi kesalahan server." } },
      { status: 500 }
    );
  }
}
