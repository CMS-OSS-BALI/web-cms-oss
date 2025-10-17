// app/api/blog-categories/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { translate } from "@/app/utils/geminiTranslator";

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
function badRequest(message, field, hint) {
  return json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        ...(field ? { field } : {}),
        ...(hint ? { hint } : {}),
      },
    },
    { status: 400 }
  );
}
function notFound() {
  return json(
    { error: { code: "NOT_FOUND", message: "Kategori blog tidak ditemukan." } },
    { status: 404 }
  );
}
function pickTrans(list, primary, fallback) {
  const by = (loc) => list?.find((t) => t.locale === loc);
  return by(primary) || by(fallback) || null;
}
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  return admin;
}
function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
function isValidSlug(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 100;
}
// accept form-data / urlencoded / json
async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (
    ct.startsWith("multipart/form-data") ||
    ct.startsWith("application/x-www-form-urlencoded")
  ) {
    const form = await req.formData();
    const body = {};
    for (const [k, v] of form.entries())
      body[k] = typeof v === "string" ? v : v?.name ?? "";
    return body;
  }
  return (await req.json().catch(() => ({}))) ?? {};
}

/* ========= GET /api/blog-categories/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");

    const item = await prisma.blog_categories.findFirst({
      where: { id, deleted_at: null },
      include: {
        translate: {
          where: { locale: { in: [locale, fallback] } },
          select: {
            id: true,
            category_id: true,
            locale: true,
            name: true,
            description: true,
          },
        },
      },
    });
    if (!item) return notFound();

    const t = pickTrans(item.translate, locale, fallback);
    const created_ts = item?.created_at
      ? new Date(item.created_at).getTime()
      : null;
    const updated_ts = item?.updated_at
      ? new Date(item.updated_at).getTime()
      : null;

    return json({
      message: "OK",
      data: {
        id: item.id,
        slug: item.slug,
        sort: item.sort,
        created_at: item.created_at,
        updated_at: item.updated_at,
        created_ts,
        updated_ts,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/blog-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kategori. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/blog-categories/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const body = await readBody(req);

    const data = {};
    const ops = [];
    let name_id_new, desc_id_new;
    let autoTranslate = String(body.autoTranslate ?? "false") === "true";

    if (body.slug !== undefined) {
      const s = String(body.slug || "").trim();
      if (!s) return badRequest("Slug tidak boleh kosong.", "slug");
      if (!isValidSlug(s)) {
        return badRequest(
          "Slug tidak valid. Gunakan huruf kecil, angka, dan strip (-). Maksimal 100 karakter.",
          "slug"
        );
      }
      data.slug = s;
    }
    if (body.sort !== undefined) {
      const v = parseInt(body.sort, 10);
      if (!Number.isFinite(v) || v < 0)
        return badRequest("sort harus bilangan bulat ≥ 0.", "sort");
      data.sort = v;
    }

    // translations (ID)
    if (body.name_id !== undefined || body.description_id !== undefined) {
      name_id_new =
        body.name_id !== undefined ? String(body.name_id) : undefined;
      desc_id_new =
        body.description_id !== undefined
          ? String(body.description_id)
          : undefined;

      ops.push(
        prisma.blog_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "id" } },
          update: {
            ...(name_id_new !== undefined
              ? { name: (name_id_new || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_id_new !== undefined
              ? { description: desc_id_new || null }
              : {}),
          },
          create: {
            category_id: id,
            locale: "id",
            name: (name_id_new || "(no title)").slice(0, 191),
            description: desc_id_new || null,
          },
        })
      );
    }

    // translations (EN) explicit
    if (body.name_en !== undefined || body.description_en !== undefined) {
      const name_en =
        body.name_en !== undefined ? String(body.name_en) : undefined;
      const desc_en =
        body.description_en !== undefined
          ? String(body.description_en)
          : undefined;

      ops.push(
        prisma.blog_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update: {
            ...(name_en !== undefined
              ? { name: (name_en || "(no title)").slice(0, 191) }
              : {}),
            ...(desc_en !== undefined ? { description: desc_en || null } : {}),
          },
          create: {
            category_id: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: desc_en || null,
          },
        })
      );
    }

    // apply main update (if any)
    if (Object.keys(data).length) {
      data.updated_at = new Date();
      await prisma.blog_categories.update({ where: { id }, data });
    } else {
      // ensure exists
      const exists = await prisma.blog_categories.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    // auto-translate from ID to EN
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
        prisma.blog_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update: {
            ...(name_en_auto ? { name: name_en_auto.slice(0, 191) } : {}),
            ...(desc_en_auto !== undefined
              ? { description: desc_en_auto ?? null }
              : {}),
          },
          create: {
            category_id: id,
            locale: "en",
            name: (name_en_auto || "(no title)").slice(0, 191),
            description: desc_en_auto ?? null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({
      message: "Kategori blog berhasil diperbarui.",
      data: { id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2002") {
      // unique constraint (slug)
      return json(
        {
          error: {
            code: "DUPLICATE",
            message: "Slug sudah digunakan. Gunakan slug lain.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/blog-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/blog-categories/:id (soft) ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();

    const id = String(params?.id || "");
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.blog_categories.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({
      message: "Kategori blog berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Akses ditolak. Silakan login sebagai admin.",
          },
        },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke resource ini.",
          },
        },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/blog-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan di sisi server. Silakan coba lagi nanti.",
        },
      },
      { status: 500 }
    );
  }
}
