// app/api/consultants/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { translate } from "@/app/utils/geminiTranslator";
import storageClient from "@/app/utils/storageClient";
import { cropFileTo9x16Webp } from "@/app/utils/cropper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const PUBLIC_PREFIX = "cms-oss";

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
   URL -> storage key
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

/* =========================
   Best-effort remover (batch)
========================= */
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
   Helpers respons & auth
========================= */
const ok = (b, i) => NextResponse.json(sanitize(b), i);
function sanitize(v) {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
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
  if (!session?.user?.email) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session.user;
}
function authError(err) {
  const status = err?.status === 401 ? 401 : 403;
  return ok(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" } },
    { status }
  );
}
function parseIdString(raw) {
  const s = String(raw ?? "").trim();
  return s || null;
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function pickTrans(list, primary, fallback) {
  if (!Array.isArray(list) || !list.length) return null;
  const by = (loc) => list.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || list[0] || null;
}

/* =========================
   Upload helpers
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

/**
 * Program image: crop 9:16 sebelum upload
 */
async function uploadConsultantProgramImage(file, id) {
  await assertImageFileOrThrow(file);

  const { file: croppedFile } = await cropFileTo9x16Webp(file, {
    height: 1920,
    quality: 90,
  });

  const res = await storageClient.uploadBufferWithPresign(croppedFile, {
    folder: `${PUBLIC_PREFIX}/consultants/${id}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/**
 * Profile image: crop 9:16 sebelum upload
 */
async function uploadConsultantProfileImage(file, id) {
  await assertImageFileOrThrow(file);

  const { file: croppedFile } = await cropFileTo9x16Webp(file, {
    height: 1920,
    quality: 90,
  });

  const res = await storageClient.uploadBufferWithPresign(croppedFile, {
    folder: `${PUBLIC_PREFIX}/consultants/${id}`,
    isPublic: true,
  });
  return res.publicUrl || null;
}

/* =========================
   PII policy
========================= */
async function canIncludePII(req, isPublic) {
  if (isPublic) return false;
  if (req.headers.get("x-ssr") !== "1") return false;
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/* ----------------- GET detail ----------------- */
export async function GET(req, { params }) {
  const url = new URL(req.url);
  const isPublic = url.searchParams.get("public") === "1";
  const includePII = await canIncludePII(req, isPublic);

  if (!includePII && !isPublic) {
    try {
      await requireAdmin();
    } catch (err) {
      return authError(err);
    }
  }

  const raw = params?.id;
  const id = parseIdString(raw);
  const locale = pickLocale(req, "locale", "id");
  const fallback = pickLocale(req, "fallback", "id");

  const baseSelect = {
    id: true,
    profile_image_url: true,
    created_at: true,
    updated_at: true,
    consultants_translate: {
      where: { locale: { in: [locale, fallback] } },
      select: { locale: true, name: true, description: true },
    },
    program_images: {
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: { id: true, image_url: true, sort: true },
    },
  };
  const select = includePII
    ? { ...baseSelect, email: true, whatsapp: true }
    : baseSelect;

  let row = await prisma.consultants.findUnique({ where: { id }, select });
  if (!row) return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const t = pickTrans(row.consultants_translate, locale, fallback);
  const data = {
    id: row.id,
    email: includePII ? row.email ?? null : null,
    whatsapp: includePII ? row.whatsapp ?? null : null,
    profile_image_url: toPublicUrl(row.profile_image_url),
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: t?.name ?? null,
    description: t?.description ?? null,
    locale_used: t?.locale ?? null,
    program_images: (row.program_images || []).map((pi) => ({
      id: pi.id,
      image_url: toPublicUrl(pi.image_url),
      sort: pi.sort ?? 0,
    })),
  };

  const resp = ok({ data });
  resp.headers.set("Cache-Control", "no-store");
  resp.headers.set("Vary", "Cookie, x-ssr, Accept-Language");
  return resp;
}

/* ----------------- PUT/PATCH ----------------- */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const id = parseIdString(params?.id);
  if (!id) return ok({ error: { code: "BAD_ID" } }, { status: 400 });

  let existing = await prisma.consultants.findUnique({
    where: { id },
    select: { id: true, profile_image_url: true },
  });
  if (!existing) return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const ct = req.headers.get("content-type") || "";
  let payload = {};
  let uploadFiles = [];
  let profileFile = null;
  let imagesMode = "replace";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const toStr = (k) => (form.has(k) ? String(form.get(k)) : undefined);

    payload.email = form.has("email") ? toStr("email") || null : undefined;
    payload.whatsapp = form.has("whatsapp")
      ? toStr("whatsapp") || null
      : undefined;
    payload.profile_image_url = form.has("profile_image_url")
      ? toStr("profile_image_url") || null
      : undefined;

    const pf = form.get("profile_file");
    if (pf && typeof pf !== "string") profileFile = pf;

    if (form.has("name_id")) payload.name_id = toStr("name_id");
    if (form.has("description_id"))
      payload.description_id = form.get("description_id") ?? null;
    if (form.has("name_en")) payload.name_en = toStr("name_en");
    if (form.has("description_en"))
      payload.description_en = form.get("description_en") ?? null;
    if (form.has("autoTranslate"))
      payload.autoTranslate =
        (toStr("autoTranslate") || "true").toLowerCase() !== "false";

    imagesMode =
      (toStr("program_images_mode") || "replace").toLowerCase() === "append"
        ? "append"
        : "replace";

    const strImages = [
      ...form.getAll("images"),
      ...form.getAll("images[]"),
      ...form.getAll("program_images"),
      ...form.getAll("program_images[]"),
    ]
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
    if (strImages.length) payload.program_images = strImages;

    uploadFiles = [...form.getAll("files"), ...form.getAll("files[]")].filter(
      (f) => f && typeof f !== "string"
    );
  } else {
    payload = await req.json().catch(() => ({}));
  }

  const parentData = {};
  if (payload.email !== undefined) parentData.email = payload.email;
  if (payload.whatsapp !== undefined) parentData.whatsapp = payload.whatsapp;
  if (payload.profile_image_url !== undefined)
    parentData.profile_image_url = payload.profile_image_url;
  if (Object.keys(parentData).length) parentData.updated_at = new Date();

  // Cleanup plan for avatar lama
  let postCleanupProfileUrl = null;

  if (Object.keys(parentData).length && !profileFile) {
    const prev = existing.profile_image_url || null;
    const next = parentData.profile_image_url ?? prev;

    try {
      await prisma.consultants.update({ where: { id }, data: parentData });
      if (prev && next && prev !== next) {
        postCleanupProfileUrl = prev;
      }
      existing = { ...existing, profile_image_url: next };
    } catch (e) {
      if (e?.code === "P2002") {
        const field = e?.meta?.target?.join?.(", ") || "unique";
        return ok(
          { error: { code: "CONFLICT", message: `${field} already in use` } },
          { status: 409 }
        );
      }
      if (e?.code === "P2025")
        return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });
      throw e;
    }
  }

  // Upsert translations: kumpulkan sebagai batch ops
  const ops = [];
  if (payload.name_id !== undefined || payload.description_id !== undefined) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: { id_consultant_locale: { id_consultant: id, locale: "id" } },
        update: {
          ...(payload.name_id !== undefined
            ? { name: String(payload.name_id ?? "(no title)").slice(0, 150) }
            : {}),
          ...(payload.description_id !== undefined
            ? { description: payload.description_id ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "id",
          name: String(payload.name_id ?? "(no title)").slice(0, 150),
          description: payload.description_id ?? null,
        },
      })
    );
  }
  if (payload.name_en !== undefined || payload.description_en !== undefined) {
    ops.push(
      prisma.consultants_translate.upsert({
        where: { id_consultant_locale: { id_consultant: id, locale: "en" } },
        update: {
          ...(payload.name_en !== undefined
            ? { name: String(payload.name_en ?? "(no title)").slice(0, 150) }
            : {}),
          ...(payload.description_en !== undefined
            ? { description: payload.description_en ?? null }
            : {}),
          updated_at: new Date(),
        },
        create: {
          id: randomUUID(),
          id_consultant: id,
          locale: "en",
          name: String(payload.name_en ?? "(no title)").slice(0, 150),
          description: payload.description_en ?? null,
        },
      })
    );
  }
  if (
    payload?.autoTranslate &&
    (payload.name_id !== undefined || payload.description_id !== undefined)
  ) {
    let name_en;
    let description_en;
    try {
      if (payload.name_id)
        name_en = await translate(String(payload.name_id), "id", "en");
    } catch {}
    try {
      if (payload.description_id)
        description_en = await translate(
          String(payload.description_id),
          "id",
          "en"
        );
    } catch {}
    if (name_en !== undefined || description_en !== undefined) {
      ops.push(
        prisma.consultants_translate.upsert({
          where: { id_consultant_locale: { id_consultant: id, locale: "en" } },
          update: {
            ...(name_en ? { name: name_en.slice(0, 150) } : {}),
            ...(description_en !== undefined
              ? { description: description_en ?? null }
              : {}),
            updated_at: new Date(),
          },
          create: {
            id: randomUUID(),
            id_consultant: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 150),
            description: description_en ?? null,
          },
        })
      );
    }
  }

  // Upload avatar baru (di luar transaksi)
  if (profileFile) {
    const newPublicUrl = await uploadConsultantProfileImage(profileFile, id);
    const current = existing.profile_image_url || null;
    if (current && current !== newPublicUrl) {
      postCleanupProfileUrl = current;
    }
    ops.push(
      prisma.consultants.update({
        where: { id },
        data: { profile_image_url: newPublicUrl, updated_at: new Date() },
      })
    );
    existing = { ...existing, profile_image_url: newPublicUrl };
  }

  // -------- Program images --------
  const stringImages = Array.isArray(payload?.program_images)
    ? payload.program_images
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
    : [];

  // Upload file program (di luar transaksi)
  let uploadedPublicUrls = [];
  if (Array.isArray(uploadFiles) && uploadFiles.length) {
    for (const f of uploadFiles) {
      const pub = await uploadConsultantProgramImage(f, id);
      if (pub) uploadedPublicUrls.push(pub);
    }
  }

  const toInsertPublic = [
    ...stringImages.map(toPublicUrl),
    ...uploadedPublicUrls,
  ].filter(Boolean);

  if (
    imagesMode === "replace" &&
    (toInsertPublic.length ||
      payload?.program_images !== undefined ||
      (Array.isArray(uploadFiles) && uploadFiles.length))
  ) {
    const existingImgs = await prisma.consultant_program_images.findMany({
      where: { id_consultant: id },
      select: { image_url: true },
    });

    const keepSet = new Set(
      toInsertPublic.map((u) => toStorageKey(u)).filter(Boolean)
    );
    const removeKeys = existingImgs
      .map((e) => toStorageKey(e.image_url))
      .filter((k) => k && !keepSet.has(k));

    const txOps = [
      prisma.consultant_program_images.deleteMany({
        where: { id_consultant: id },
      }),
    ];
    if (toInsertPublic.length) {
      txOps.push(
        prisma.consultant_program_images.createMany({
          data: toInsertPublic.map((url, idx) => ({
            id_consultant: id,
            image_url: url,
            sort: idx,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        })
      );
    }

    await prisma.$transaction(txOps);

    // cleanup file storage best-effort
    try {
      const bundle = postCleanupProfileUrl
        ? [postCleanupProfileUrl, ...removeKeys]
        : removeKeys;
      await removeStorageObjects(bundle);
    } catch {}
  } else {
    // Append
    if (toInsertPublic.length) {
      const last = await prisma.consultant_program_images.findFirst({
        where: { id_consultant: id },
        orderBy: [{ sort: "desc" }, { id: "desc" }],
        select: { sort: true },
      });
      let start = Number(last?.sort ?? -1) + 1;
      await prisma.consultant_program_images.createMany({
        data: toInsertPublic.map((url, i) => ({
          id_consultant: id,
          image_url: url,
          sort: start + i,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }

    if (ops.length) {
      await prisma.$transaction(ops);
      if (postCleanupProfileUrl) {
        try {
          await removeStorageObjects([postCleanupProfileUrl]);
        } catch {}
      }
    } else if (postCleanupProfileUrl) {
      try {
        await removeStorageObjects([postCleanupProfileUrl]);
      } catch {}
    }
  }

  const resp = ok({ data: { id } });
  resp.headers.set("Cache-Control", "no-store");
  resp.headers.set("Vary", "Cookie, x-ssr, Accept-Language");
  return resp;
}

/* ----------------- DELETE Konsultan ----------------- */
export async function DELETE(_req, { params }) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const id = parseIdString(params?.id);
  if (!id) return ok({ error: { code: "BAD_ID" } }, { status: 400 });

  const rows = await prisma.consultant_program_images.findMany({
    where: { id_consultant: id },
    select: { image_url: true },
  });
  const parent = await prisma.consultants.findUnique({
    where: { id },
    select: { profile_image_url: true },
  });

  try {
    await prisma.consultants.delete({ where: { id } });
  } catch (e) {
    if (e?.code === "P2025")
      return ok({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return ok({ error: { code: "SERVER_ERROR" } }, { status: 500 });
  }

  // cleanup best-effort
  try {
    const paths = [
      ...rows.map((r) => r.image_url),
      parent?.profile_image_url || null,
    ].filter(Boolean);
    await removeStorageObjects(paths);
  } catch {}

  return new NextResponse(null, { status: 204 });
}
