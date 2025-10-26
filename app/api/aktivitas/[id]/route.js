// app/api/aktivitas/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
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
const ADMIN_TEST_KEY = process.env.ADMIN_TEST_KEY || "";

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
function toBool(v, dflt = null) {
  if (v === null || v === undefined || v === "") return dflt;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return dflt;
}
function asInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
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
/** path → public URL */
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

  return objectPath;
}

/* -------------------- GET (detail) -------------------- */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const url = new URL(req.url);
    const locale = normalizeLocale(
      url.searchParams.get("locale") || DEFAULT_LOCALE
    );
    const fallback = normalizeLocale(
      url.searchParams.get("fallback") || DEFAULT_LOCALE
    );

    const row = await prisma.aktivitas.findUnique({
      where: { id },
      include: {
        translate: {
          where: { locale: { in: [locale, fallback] } },
          select: { locale: true, name: true, description: true },
        },
      },
    });

    if (!row || row.deleted_at)
      return json({ message: "Not found" }, { status: 404 });

    const t = pickTrans(row.translate, locale, fallback);
    const created_ts = row?.created_at
      ? new Date(row.created_at).getTime()
      : null;
    const updated_ts = row?.updated_at
      ? new Date(row.updated_at).getTime()
      : null;
    const deleted_at_ts = row?.deleted_at
      ? new Date(row.deleted_at).getTime()
      : null;

    return json({
      message: "OK",
      data: {
        id: row.id,
        image_url: toPublicUrl(row.image_url),
        sort: row.sort,
        is_published: row.is_published,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        created_ts,
        updated_ts,
        deleted_at_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/aktivitas/[id] error:", err);
    return json({ message: "Failed to fetch aktivitas" }, { status: 500 });
  }
}

/* -------------------- PATCH (update, admin) -------------------- */
export async function PATCH(req, { params }) {
  try {
    const { adminId } = await assertAdmin(req);
    if (!adminId) return json({ message: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const { body, file } = await readBodyAndFile(req);

    // file upload wins, else use image_url if provided
    let image_url = undefined;
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
    } else if ("image_url" in body) {
      image_url = String(body.image_url || "").trim();
    }

    const sort = "sort" in body ? asInt(body.sort, 0) : undefined;
    const is_published =
      "is_published" in body
        ? toBool(body.is_published, false) ?? false
        : undefined;

    let name_id =
      "name_id" in body ? String(body.name_id || "").trim() : undefined;
    let description_id =
      "description_id" in body ? body.description_id ?? null : undefined;
    let name_en =
      "name_en" in body ? String(body.name_en || "").trim() : undefined;
    let description_en =
      "description_en" in body ? body.description_en ?? null : undefined;

    const autoTranslate =
      String(body?.autoTranslate ?? "true").toLowerCase() !== "false";

    // Ambil existing translate agar bisa infer auto-translate dua arah
    const existing = await prisma.aktivitas_translate.findMany({
      where: { id_aktivitas: id, locale: { in: [DEFAULT_LOCALE, EN_LOCALE] } },
      select: { locale: true, name: true, description: true },
    });
    const cur = (lc) => existing.find((x) => x.locale === lc) || null;

    if (autoTranslate) {
      // ID-only update → isi EN
      if (
        (name_id !== undefined || description_id !== undefined) &&
        name_en === undefined &&
        description_en === undefined
      ) {
        const srcName =
          name_id !== undefined ? name_id : cur(DEFAULT_LOCALE)?.name || "";
        const srcDesc =
          description_id !== undefined
            ? description_id
            : cur(DEFAULT_LOCALE)?.description ?? "";
        if (srcName && name_en === undefined)
          name_en = await translate(srcName, "id", "en");
        if (srcDesc && description_en === undefined && srcDesc !== null) {
          description_en = await translate(srcDesc, "id", "en");
        }
      }
      // EN-only update → isi ID
      if (
        (name_en !== undefined || description_en !== undefined) &&
        name_id === undefined &&
        description_id === undefined
      ) {
        const srcName =
          name_en !== undefined ? name_en : cur(EN_LOCALE)?.name || "";
        const srcDesc =
          description_en !== undefined
            ? description_en
            : cur(EN_LOCALE)?.description ?? "";
        if (srcName && name_id === undefined)
          name_id = await translate(srcName, "en", "id");
        if (srcDesc && description_id === undefined && srcDesc !== null) {
          description_id = await translate(srcDesc, "en", "id");
        }
      }
    }

    const data = {
      updated_at: new Date(),
      ...(image_url !== undefined ? { image_url } : {}),
      ...(sort !== undefined ? { sort } : {}),
      ...(is_published !== undefined ? { is_published } : {}),
      ...((name_id !== undefined ||
        description_id !== undefined ||
        name_en !== undefined ||
        description_en !== undefined) && {
        translate: {
          upsert: [
            ...(name_id !== undefined || description_id !== undefined
              ? [
                  {
                    where: {
                      id_aktivitas_locale: {
                        id_aktivitas: id,
                        locale: DEFAULT_LOCALE,
                      },
                    },
                    update: {
                      ...(name_id !== undefined
                        ? { name: String(name_id).slice(0, 191) }
                        : {}),
                      ...(description_id !== undefined
                        ? { description: description_id }
                        : {}),
                      updated_at: new Date(),
                    },
                    create: {
                      id_aktivitas: id,
                      locale: DEFAULT_LOCALE,
                      name: String(name_id ?? "(no title)").slice(0, 191),
                      description: description_id ?? null,
                    },
                  },
                ]
              : []),
            ...(name_en !== undefined || description_en !== undefined
              ? [
                  {
                    where: {
                      id_aktivitas_locale: {
                        id_aktivitas: id,
                        locale: EN_LOCALE,
                      },
                    },
                    update: {
                      ...(name_en !== undefined
                        ? { name: String(name_en).slice(0, 191) }
                        : {}),
                      ...(description_en !== undefined
                        ? { description: description_en }
                        : {}),
                      updated_at: new Date(),
                    },
                    create: {
                      id_aktivitas: id,
                      locale: EN_LOCALE,
                      name: String(name_en ?? "(no title)").slice(0, 191),
                      description: description_en ?? null,
                    },
                  },
                ]
              : []),
          ],
        },
      }),
    };

    const updated = await prisma.aktivitas.update({
      where: { id },
      data,
      include: {
        translate: { where: { locale: { in: [DEFAULT_LOCALE, EN_LOCALE] } } },
      },
    });

    const mapped = {
      ...updated,
      image_url: toPublicUrl(updated.image_url),
      created_ts: toMs(updated.created_at),
      updated_ts: toMs(updated.updated_at),
      deleted_at_ts: toMs(updated.deleted_at),
    };

    return json({ message: "Aktivitas diperbarui.", data: mapped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PATCH /api/aktivitas/[id] error:", err);
    return json({ message: "Gagal memperbarui aktivitas" }, { status: 500 });
  }
}

/* -------------------- DELETE (soft, admin) -------------------- */
export async function DELETE(req, { params }) {
  try {
    const { adminId } = await assertAdmin(req);
    if (!adminId) return json({ message: "Unauthorized" }, { status: 401 });

    const id = params?.id;
    if (!id) return json({ message: "id is required" }, { status: 400 });

    const deleted = await prisma.aktivitas.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    const mapped = {
      ...deleted,
      image_url: toPublicUrl(deleted.image_url),
      created_ts: toMs(deleted.created_at),
      updated_ts: toMs(deleted.updated_at),
      deleted_at_ts: toMs(deleted.deleted_at),
    };

    return json({ message: "Aktivitas dihapus.", data: mapped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("DELETE /api/aktivitas/[id] error:", err);
    return json({ message: "Gagal menghapus aktivitas" }, { status: 500 });
  }
}
