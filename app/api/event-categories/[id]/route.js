// app/api/event-categories/[id]/route.js
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
    {
      error: { code: "NOT_FOUND", message: "Kategori event tidak ditemukan." },
    },
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
  return admin.id;
}
function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/* ========= GET /api/event-categories/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");
    const locales = locale === fallback ? [locale] : [locale, fallback];

    const item = await prisma.event_categories.findFirst({
      where: { id, deleted_at: null },
      include: {
        translate: {
          where: { locale: { in: locales } },
          select: { locale: true, name: true, description: true },
        },
      },
    });
    if (!item) return notFound();

    const t = pickTrans(item.translate, locale, fallback);

    return json({
      message: "OK",
      data: {
        id: item.id,
        slug: item.slug,
        sort: item.sort,
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Gagal memuat detail kategori event.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/event-categories/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const ct = req.headers.get("content-type") || "";

    // nilai kandidat update
    let slug; // undefined = tidak diubah
    let sort; // undefined = tidak diubah
    let name_id; // undefined = tidak diubah
    let description_id; // undefined = tidak diubah
    let name_en; // undefined = tidak diubah
    let description_en; // undefined = tidak diubah
    let autoTranslate = false;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      if (form.get("slug") !== null) {
        const raw = String(form.get("slug") || "").trim();
        slug = raw || undefined;
      }
      if (form.get("sort") !== null) {
        const v = parseInt(form.get("sort"), 10);
        if (!Number.isFinite(v) || v < 0)
          return badRequest("sort harus bilangan bulat >= 0", "sort");
        sort = v;
      }

      if (form.get("name_id") !== null) name_id = String(form.get("name_id"));
      if (form.get("description_id") !== null)
        description_id =
          form.get("description_id") === null
            ? null
            : String(form.get("description_id"));

      if (form.get("name_en") !== null) name_en = String(form.get("name_en"));
      if (form.get("description_en") !== null)
        description_en =
          form.get("description_en") === null
            ? null
            : String(form.get("description_en"));

      autoTranslate = String(form.get("autoTranslate") ?? "false") === "true";
    } else {
      const body = await req.json().catch(() => ({}));

      if (body.slug !== undefined) {
        const raw = String(body.slug || "").trim();
        slug = raw || undefined;
      }
      if (body.sort !== undefined) {
        const v = parseInt(body.sort, 10);
        if (!Number.isFinite(v) || v < 0)
          return badRequest("sort harus bilangan bulat >= 0", "sort");
        sort = v;
      }

      if (body.name_id !== undefined) name_id = String(body.name_id);
      if (body.description_id !== undefined)
        description_id =
          body.description_id === null ? null : String(body.description_id);

      if (body.name_en !== undefined) name_en = String(body.name_en);
      if (body.description_en !== undefined)
        description_en =
          body.description_en === null ? null : String(body.description_en);

      autoTranslate = Boolean(body?.autoTranslate);
    }

    // validasi slug (kalau mau diubah)
    if (slug !== undefined) {
      const s = slug || ""; // allow re-derive from name_id
      let finalSlug = s;
      if (!finalSlug && name_id) finalSlug = slugify(String(name_id));
      if (!finalSlug)
        return badRequest("Slug wajib diisi ketika mengubah slug.", "slug");
      if (!/^[a-z0-9-]{1,100}$/.test(finalSlug)) {
        return badRequest(
          "Slug hanya boleh huruf kecil, angka, dan tanda minus (-), maks 100 karakter.",
          "slug"
        );
      }
      slug = finalSlug;
    }

    // eksekusi dalam satu transaksi
    await prisma.$transaction(async (tx) => {
      const exists = await tx.event_categories.findUnique({ where: { id } });
      if (!exists)
        throw Object.assign(new Error("NOT_FOUND"), { code: "P2025" });

      // update fields utama
      const data = {};
      if (slug !== undefined) data.slug = slug;
      if (sort !== undefined) data.sort = sort;
      if (Object.keys(data).length) {
        data.updated_at = new Date();
        await tx.event_categories.update({ where: { id }, data });
      }

      // upsert i18n: ID
      if (name_id !== undefined || description_id !== undefined) {
        const update = {};
        if (name_id !== undefined) update.name = name_id || "";
        if (description_id !== undefined)
          update.description = description_id ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "id" } },
          update,
          create: {
            category_id: id,
            locale: "id",
            name: update.name ?? "",
            description: update.description ?? null,
          },
        });
      }

      // upsert i18n: EN (manual)
      if (name_en !== undefined || description_en !== undefined) {
        const update = {};
        if (name_en !== undefined) update.name = name_en || "";
        if (description_en !== undefined)
          update.description = description_en ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update,
          create: {
            category_id: id,
            locale: "en",
            name: update.name ?? "",
            description: update.description ?? null,
          },
        });
      }

      // auto-translate ke EN ketika ada perubahan ID
      if (
        autoTranslate &&
        (name_id !== undefined || description_id !== undefined)
      ) {
        const nameEnAuto =
          name_id !== undefined && name_id !== ""
            ? await translate(String(name_id), "id", "en")
            : undefined;
        const descEnAuto =
          description_id !== undefined
            ? await translate(String(description_id || ""), "id", "en")
            : undefined;

        const update = {};
        if (nameEnAuto) update.name = nameEnAuto;
        if (descEnAuto !== undefined) update.description = descEnAuto ?? null;

        await tx.event_categories_translate.upsert({
          where: { category_id_locale: { category_id: id, locale: "en" } },
          update,
          create: {
            category_id: id,
            locale: "en",
            name: update.name ?? (name_id ? String(name_id) : ""),
            description:
              update.description !== undefined
                ? update.description
                : description_id ?? null,
          },
        });
      }
    });

    return json({
      message: "Kategori event berhasil diperbarui.",
      data: { id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        { error: { code: "UNAUTHORIZED", message: "Akses ditolak." } },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        { error: { code: "FORBIDDEN", message: "Anda tidak memiliki akses." } },
        { status: 403 }
      );
    }
    if (err?.code === "P2002") {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "Slug sudah digunakan. Gunakan slug lain.",
            field: "slug",
          },
        },
        { status: 409 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat memperbarui kategori event.",
        },
      },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/event-categories/:id ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("Parameter id wajib disertakan.", "id");

    const deleted = await prisma.event_categories.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({
      message: "Kategori event berhasil dihapus (soft delete).",
      data: { id: deleted.id },
    });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        { error: { code: "UNAUTHORIZED", message: "Akses ditolak." } },
        { status: 401 }
      );
    }
    if (status === 403) {
      return json(
        { error: { code: "FORBIDDEN", message: "Anda tidak memiliki akses." } },
        { status: 403 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/event-categories/${params?.id} error:`, err);
    return json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus kategori event.",
        },
      },
      { status: 500 }
    );
  }
}
