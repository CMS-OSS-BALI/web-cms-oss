// app/api/blog/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { translate } from "@/app/utils/geminiTranslator";

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

/* ========= GET /api/blog/:id (DETAIL) ========= */
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

    return json({
      data: {
        id: item.id,
        image_url: item.image_url,
        views_count: item.views_count,
        likes_count: item.likes_count,
        created_at: item.created_at,
        updated_at: item.updated_at,
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

/* ========= PUT/PATCH /api/blog/:id (UPDATE + upsert translate + optional auto-translate) ========= */
/**
 * Body (opsional):
 *  - image_url?
 *  - name_id?, description_id?   (update/insert locale 'id')
 *  - name_en?, description_en?   (update/insert locale 'en')
 *  - autoTranslate? (boolean)    default false; kalau true dan ada perubahan 'id', EN di-generate via Gemini
 *  - views_count?, likes_count?  (bilangan >= 0) — untuk admin panel manual set
 */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const body = await req.json().catch(() => ({}));

    // 1) update parent
    const data = {};
    if (body.image_url !== undefined) data.image_url = body.image_url ?? null;

    if (body.views_count !== undefined) {
      const v = parseInt(body.views_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("views_count harus bilangan >= 0");
      data.views_count = v;
    }
    if (body.likes_count !== undefined) {
      const v = parseInt(body.likes_count, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("likes_count harus bilangan >= 0");
      data.likes_count = v;
    }
    if (Object.keys(data).length) data.updated_at = new Date();

    if (Object.keys(data).length) {
      await prisma.blog.update({ where: { id }, data });
    } else {
      // pastikan record ada
      const exists = await prisma.blog.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    // 2) upsert translate
    const ops = [];

    if (body.name_id !== undefined || body.description_id !== undefined) {
      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "id" } },
          update: {
            ...(body.name_id !== undefined
              ? { name: String(body.name_id).slice(0, 191) }
              : {}),
            ...(body.description_id !== undefined
              ? { description: body.description_id ?? null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: "id",
            name: String(body.name_id ?? "(no title)").slice(0, 191),
            description: body.description_id ?? null,
          },
        })
      );
    }

    if (body.name_en !== undefined || body.description_en !== undefined) {
      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "en" } },
          update: {
            ...(body.name_en !== undefined
              ? { name: String(body.name_en).slice(0, 191) }
              : {}),
            ...(body.description_en !== undefined
              ? { description: body.description_en ?? null }
              : {}),
          },
          create: {
            id_blog: id,
            locale: "en",
            name: String(body.name_en ?? "(no title)").slice(0, 191),
            description: body.description_en ?? null,
          },
        })
      );
    }

    // autoTranslate EN dari ID bila diminta
    if (body.autoTranslate && (body.name_id || body.description_id)) {
      const name_en = body.name_id
        ? await translate(String(body.name_id), "id", "en")
        : undefined;
      const desc_en = body.description_id
        ? await translate(String(body.description_id), "id", "en")
        : undefined;

      ops.push(
        prisma.blog_translate.upsert({
          where: { id_blog_locale: { id_blog: id, locale: "en" } },
          update: {
            ...(name_en ? { name: name_en.slice(0, 191) } : {}),
            ...(desc_en !== undefined ? { description: desc_en ?? null } : {}),
          },
          create: {
            id_blog: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en ?? null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({ data: { id } });
  } catch (err) {
    console.error(`PATCH /api/blog/${params?.id} error:`, err);
    if (err?.code === "P2025") return notFound();
    return NextResponse.json(
      { message: "Failed to update blog" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/blog/:id (SOFT DELETE) ========= */
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
