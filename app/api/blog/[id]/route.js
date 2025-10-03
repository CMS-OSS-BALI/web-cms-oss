// app/api/blog/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
function notFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

/* ========= Supabase ========= */
const BUCKET = process.env.SUPABASE_BUCKET;
function getPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
async function uploadBlogToSupabase(file) {
  if (!(file instanceof File)) throw new Error("NO_FILE");
  const MAX = 10 * 1024 * 1024;
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

/* ========= GET /api/blog/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");

    const item = await prisma.blog.findFirst({
      where: { id, deleted_at: null },
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
    });
    if (!item) return notFound();

    const t = pickTrans(item.blog_translate, locale, fallback);
    const image_public_url = getPublicUrl(item.image_url);
    const created_ts = item?.created_at
      ? new Date(item.created_at).getTime()
      : null;
    const updated_ts = item?.updated_at
      ? new Date(item.updated_at).getTime()
      : null;

    return json({
      data: {
        id: item.id,
        image_url: item.image_url,
        image_public_url,
        views_count: item.views_count,
        likes_count: item.likes_count,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts, // <-- NEW
        updated_ts, // <-- NEW
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/blog/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch blog detail" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/blog/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const ct = req.headers.get("content-type") || "";
    const data = {};
    const ops = [];
    let name_id_new, desc_id_new;
    let autoTranslate = false;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      const file = form.get("file");
      if (file && typeof file !== "string") {
        try {
          const path = await uploadBlogToSupabase(file);
          data.image_url = path;
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

      if (form.get("image_url") !== null) {
        const v = String(form.get("image_url") || "").trim();
        data.image_url = v || null;
      }

      if (form.get("views_count") !== null) {
        const v = parseInt(form.get("views_count"), 10);
        if (!Number.isFinite(v) || v < 0)
          return NextResponse.json(
            { message: "views_count harus bilangan >= 0" },
            { status: 400 }
          );
        data.views_count = v;
      }
      if (form.get("likes_count") !== null) {
        const v = parseInt(form.get("likes_count"), 10);
        if (!Number.isFinite(v) || v < 0)
          return NextResponse.json(
            { message: "likes_count harus bilangan >= 0" },
            { status: 400 }
          );
        data.likes_count = v;
      }

      if (form.get("name_id") !== null || form.get("description_id") !== null) {
        name_id_new =
          form.get("name_id") != null ? String(form.get("name_id")) : undefined;
        desc_id_new =
          form.get("description_id") != null
            ? String(form.get("description_id"))
            : undefined;

        ops.push(
          prisma.blog_translate.upsert({
            where: { id_blog_locale: { id_blog: id, locale: "id" } },
            update: {
              ...(name_id_new !== undefined
                ? { name: (name_id_new || "(no title)").slice(0, 191) }
                : {}),
              ...(desc_id_new !== undefined
                ? { description: desc_id_new || null }
                : {}),
            },
            create: {
              id_blog: id,
              locale: "id",
              name: (name_id_new || "(no title)").slice(0, 191),
              description: desc_id_new || null,
            },
          })
        );
      }

      if (form.get("name_en") !== null || form.get("description_en") !== null) {
        const name_en =
          form.get("name_en") != null ? String(form.get("name_en")) : undefined;
        const desc_en =
          form.get("description_en") != null
            ? String(form.get("description_en"))
            : undefined;

        ops.push(
          prisma.blog_translate.upsert({
            where: { id_blog_locale: { id_blog: id, locale: "en" } },
            update: {
              ...(name_en !== undefined
                ? { name: (name_en || "(no title)").slice(0, 191) }
                : {}),
              ...(desc_en !== undefined
                ? { description: desc_en || null }
                : {}),
            },
            create: {
              id_blog: id,
              locale: "en",
              name: (name_en || "(no title)").slice(0, 191),
              description: desc_en || null,
            },
          })
        );
      }

      autoTranslate = String(form.get("autoTranslate") ?? "false") === "true";
    } else {
      const body = await req.json().catch(() => ({}));

      if (body.image_url !== undefined) data.image_url = body.image_url ?? null;
      if (body.views_count !== undefined) {
        const v = parseInt(body.views_count, 10);
        if (!Number.isFinite(v) || v < 0)
          return NextResponse.json(
            { message: "views_count harus bilangan >= 0" },
            { status: 400 }
          );
        data.views_count = v;
      }
      if (body.likes_count !== undefined) {
        const v = parseInt(body.likes_count, 10);
        if (!Number.isFinite(v) || v < 0)
          return NextResponse.json(
            { message: "likes_count harus bilangan >= 0" },
            { status: 400 }
          );
        data.likes_count = v;
      }

      if (body.name_id !== undefined || body.description_id !== undefined) {
        name_id_new =
          body.name_id !== undefined ? String(body.name_id) : undefined;
        desc_id_new =
          body.description_id !== undefined
            ? String(body.description_id)
            : undefined;

        ops.push(
          prisma.blog_translate.upsert({
            where: { id_blog_locale: { id_blog: id, locale: "id" } },
            update: {
              ...(name_id_new !== undefined
                ? { name: (name_id_new || "(no title)").slice(0, 191) }
                : {}),
              ...(desc_id_new !== undefined
                ? { description: desc_id_new || null }
                : {}),
            },
            create: {
              id_blog: id,
              locale: "id",
              name: (name_id_new || "(no title)").slice(0, 191),
              description: desc_id_new || null,
            },
          })
        );
      }

      if (body.name_en !== undefined || body.description_en !== undefined) {
        const name_en =
          body.name_en !== undefined ? String(body.name_en) : undefined;
        const desc_en =
          body.description_en !== undefined
            ? String(body.description_en)
            : undefined;

        ops.push(
          prisma.blog_translate.upsert({
            where: { id_blog_locale: { id_blog: id, locale: "en" } },
            update: {
              ...(name_en !== undefined
                ? { name: (name_en || "(no title)").slice(0, 191) }
                : {}),
              ...(desc_en !== undefined
                ? { description: desc_en || null }
                : {}),
            },
            create: {
              id_blog: id,
              locale: "en",
              name: (name_en || "(no title)").slice(0, 191),
              description: desc_en || null,
            },
          })
        );
      }

      autoTranslate = Boolean(body?.autoTranslate);
    }

    if (Object.keys(data).length) data.updated_at = new Date();
    if (Object.keys(data).length) {
      await prisma.blog.update({ where: { id }, data });
    } else {
      const exists = await prisma.blog.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    if (
      autoTranslate &&
      (name_id_new !== undefined || desc_id_new !== undefined)
    ) {
      const name_en_auto = name_id_new
        ? await translate(String(name_id_new), "id", "en")
        : undefined;
      const desc_en_auto =
        desc_id_new !== undefined
          ? await translate(String(desc_id_new || ""), "id", "en")
          : undefined;

      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "en" } },
          update: {
            ...(name_en_auto ? { name: name_en_auto.slice(0, 191) } : {}),
            ...(desc_en_auto !== undefined
              ? { description: desc_en_auto ?? null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: "en",
            name: (name_en_auto || "(no title)").slice(0, 191),
            description: desc_en_auto ?? null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    const updated = await prisma.blog.findUnique({ where: { id } });
    const image_public_url = updated ? getPublicUrl(updated.image_url) : null;

    return json({ data: { id, image_public_url } });
  } catch (err) {
    console.error(`PATCH /api/blog/${params?.id} error:`, err);
    if (err?.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to update blog" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/blog/:id ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const deleted = await prisma.blog.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({ data: deleted });
  } catch (err) {
    console.error(`DELETE /api/blog/${params?.id} error:`, err);
    if (err?.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
