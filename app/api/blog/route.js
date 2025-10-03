// app/api/blog/route.js
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
function getOrderBy(param) {
  const allowed = new Set([
    "created_at",
    "updated_at",
    "views_count",
    "likes_count",
  ]);
  const [field = "created_at", dir = "desc"] = String(param || "").split(":");
  const key = allowed.has(field) ? field : "created_at";
  const order = String(dir).toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [key]: order }];
}
function pickLocale(req, key = "locale", dflt = "id") {
  try {
    const { searchParams } = new URL(req.url);
    return (searchParams.get(key) || dflt).slice(0, 5).toLowerCase();
  } catch {
    return dflt;
  }
}
function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}
async function getAdminUserId() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
    if (session?.user?.email) {
      const admin = await prisma.admin_users.findUnique({
        where: { email: session.user.email },
      });
      if (admin?.id) return admin.id;
    }
  } catch (e) {
    console.error("getAdminUserId error:", e);
  }
  return null;
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}

/* ========= Supabase helpers ========= */
const BUCKET = process.env.SUPABASE_BUCKET;
function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
async function uploadBlogToSupabase(file) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  const MAX = 10 * 1024 * 1024; // 10MB
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if ((file.size || 0) > MAX) throw new Error("PAYLOAD_TOO_LARGE");
  if (!allowed.includes(file.type)) throw new Error("UNSUPPORTED_TYPE");

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;
  const objectPath = `blog/${new Date().toISOString().slice(0, 10)}/${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return objectPath;
}

/* ========= GET /api/blog (LIST) ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const page = Math.max(1, asInt(searchParams.get("page"), 1));
    const perPage = Math.min(
      100,
      Math.max(1, asInt(searchParams.get("perPage"), 12))
    );
    const orderBy = getOrderBy(searchParams.get("sort"));
    const withDeleted = searchParams.get("with_deleted") === "1";
    const onlyDeleted = searchParams.get("only_deleted") === "1";

    const where = {
      ...(onlyDeleted
        ? { NOT: { deleted_at: null } }
        : withDeleted
        ? {}
        : { deleted_at: null }),
      ...(q
        ? {
            blog_translate: {
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
      prisma.blog.count({ where }),
      prisma.blog.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          blog_translate: {
            where: { locale: { in: [locale, fallback] } },
            select: {
              id: true,
              id_blog: true,
              locale: true,
              name: true,
              description: true,
            },
          },
        },
      }),
    ]);

    const data = await Promise.all(
      rows.map(async (r) => {
        const t = pickTrans(r.blog_translate, locale, fallback);
        const image_public_url = getPublicUrl(r.image_url);
        const created_ts = r?.created_at
          ? new Date(r.created_at).getTime()
          : null;
        const updated_ts = r?.updated_at
          ? new Date(r.updated_at).getTime()
          : null;

        return {
          id: r.id,
          image_url: r.image_url,
          image_public_url,
          views_count: r.views_count,
          likes_count: r.likes_count,
          created_at: r.created_at,
          updated_at: r.updated_at,
          deleted_at: r.deleted_at,
          created_ts, // <-- NEW
          updated_ts, // <-- NEW
          name: t?.name ?? null,
          description: t?.description ?? null,
          locale_used: t?.locale ?? null,
        };
      })
    );

    return json({
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
    console.error("GET /api/blog error:", err);
    return NextResponse.json(
      { message: "Failed to fetch blog list" },
      { status: 500 }
    );
  }
}

/* ========= POST /api/blog ========= */
export async function POST(req) {
  try {
    const admin_user_id = await getAdminUserId();
    if (!admin_user_id) {
      return NextResponse.json(
        { message: "Unauthorized (session admin tidak ditemukan)" },
        { status: 401 }
      );
    }

    const ct = req.headers.get("content-type") || "";
    let image_url = "";
    let name_id = "";
    let description_id = null;
    let name_en = "";
    let description_en = "";
    let autoTranslate = true;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");

      image_url = String(form.get("image_url") || "").trim();
      name_id = String(form.get("name_id") ?? form.get("name") ?? "").trim();
      description_id =
        form.get("description_id") != null
          ? String(form.get("description_id"))
          : form.get("description") != null
          ? String(form.get("description"))
          : null;
      name_en = String(form.get("name_en") || "").trim();
      description_en = String(form.get("description_en") || "").trim();
      autoTranslate = String(form.get("autoTranslate") ?? "true") !== "false";

      if (file && typeof file !== "string") {
        try {
          const path = await uploadBlogToSupabase(file);
          image_url = path;
        } catch (e) {
          if (e?.message === "PAYLOAD_TOO_LARGE")
            return NextResponse.json(
              { message: "Maksimal 10MB" },
              { status: 413 }
            );
          if (e?.message === "UNSUPPORTED_TYPE")
            return NextResponse.json(
              { message: "Format harus JPEG/PNG/WebP" },
              { status: 415 }
            );
          console.error("upload error:", e);
          return NextResponse.json(
            { message: "Upload gagal" },
            { status: 500 }
          );
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      image_url = String(body?.image_url || "").trim();
      name_id = String(body?.name_id ?? body?.name ?? "").trim();
      description_id =
        typeof body?.description_id === "string"
          ? body.description_id
          : typeof body?.description === "string"
          ? body.description
          : null;
      autoTranslate = body?.autoTranslate !== false;
      name_en = String(body?.name_en || "").trim();
      description_en = String(body?.description_en || "").trim();
    }

    if (!image_url) return badRequest("image_url wajib diisi");
    if (!name_id) return badRequest("name_id (Bahasa Indonesia) wajib diisi");

    const id = randomUUID();

    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.blog.create({
        data: { id, admin_user_id, image_url },
      });

      await tx.blog_translate.create({
        data: {
          id_blog: id,
          locale: "id",
          name: name_id.slice(0, 191),
          description: description_id || null,
        },
      });

      if (autoTranslate) {
        if (!name_en && name_id) name_en = await translate(name_id, "id", "en");
        if (!description_en && description_id)
          description_en = await translate(description_id, "id", "en");
      }

      if (name_en || description_en) {
        await tx.blog_translate.create({
          data: {
            id_blog: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        });
      }

      return parent;
    });

    const image_public_url = getPublicUrl(image_url);

    return json(
      {
        data: {
          id: created.id,
          image_url,
          image_public_url,
          name_id,
          description_id,
          name_en: name_en || null,
          description_en: description_en || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/blog error:", err);
    return NextResponse.json(
      { message: "Failed to create blog" },
      { status: 500 }
    );
  }
}
