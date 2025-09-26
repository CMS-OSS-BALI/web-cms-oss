// app/api/jurusan/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomUUID } from "crypto";
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
function normalizeUrl255(v) {
  const s = String(v || "").trim();
  return s ? s.slice(0, 255) : "";
}

/* ========= GET /api/jurusan/:id ========= */
export async function GET(req, { params }) {
  try {
    const id = params?.id;
    const locale = pickLocale(req, "locale", "id");
    const fallback = pickLocale(req, "fallback", "id");

    const item = await prisma.jurusan.findFirst({
      where: { id, deleted_at: null },
      include: {
        jurusan_translate: {
          where: { locale: { in: [locale, fallback] } },
          select: {
            id: true,
            id_jurusan: true,
            locale: true,
            name: true,
            description: true,
          },
        },
      },
    });
    if (!item) return notFound();

    const t = pickTrans(item.jurusan_translate, locale, fallback);

    return json({
      data: {
        id: item.id,
        partner_id: item.partner_id,
        image_url: item.image_url, // ← baru
        register_price:
          item.register_price == null
            ? null
            : typeof item.register_price === "object" &&
              "toString" in item.register_price
            ? item.register_price.toString()
            : String(item.register_price),
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: t?.name ?? null,
        description: t?.description ?? null,
        locale_used: t?.locale ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to fetch jurusan detail" },
      { status: 500 }
    );
  }
}

/* ========= PUT/PATCH /api/jurusan/:id ========= */
export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");
    const body = await req.json().catch(() => ({}));

    const parentOps = {};
    if (body.partner_id !== undefined) {
      const partner_id = String(body.partner_id || "").trim();
      if (!partner_id) return badRequest("partner_id tidak boleh kosong");
      parentOps.partner_id = partner_id;
    }
    if (body.register_price !== undefined) {
      const priceStr = String(body.register_price).trim();
      if (priceStr === "")
        return badRequest("register_price tidak boleh kosong");
      parentOps.register_price = priceStr;
    }
    if (body.image_url !== undefined) {
      const url = normalizeUrl255(body.image_url);
      if (!url) return badRequest("image_url tidak boleh kosong");
      parentOps.image_url = url;
    }

    if (Object.keys(parentOps).length) {
      parentOps.updated_at = new Date();
      await prisma.jurusan.update({ where: { id }, data: parentOps });
    } else {
      const exists = await prisma.jurusan.findUnique({ where: { id } });
      if (!exists) return notFound();
    }

    const ops = [];

    if (body.name_id !== undefined || body.description_id !== undefined) {
      ops.push(
        prisma.jurusan_translate.upsert({
          where: { id_jurusan_locale: { id_jurusan: id, locale: "id" } },
          update: {
            ...(body.name_id !== undefined
              ? { name: String(body.name_id).slice(0, 191) }
              : {}),
            ...(body.description_id !== undefined
              ? { description: body.description_id ?? null }
              : {}),
          },
          create: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "id",
            name: String(body.name_id ?? "(no title)").slice(0, 191),
            description: body.description_id ?? null,
          },
        })
      );
    }

    const autoTranslate = body?.autoTranslate !== false;
    const hasNameEn = Object.prototype.hasOwnProperty.call(body, "name_en");
    const hasDescriptionEn = Object.prototype.hasOwnProperty.call(
      body,
      "description_en"
    );

    let name_en = hasNameEn ? String(body.name_en || "").trim() : "";
    let description_en = hasDescriptionEn
      ? typeof body.description_en === "string"
        ? body.description_en
        : ""
      : "";

    if (autoTranslate && (body.name_id || body.description_id)) {
      if (!name_en && body.name_id) {
        try {
          name_en = await translate(String(body.name_id), "id", "en");
        } catch (e) {
          console.error(e);
        }
      }
      if (!description_en && body.description_id) {
        try {
          description_en = await translate(
            String(body.description_id),
            "id",
            "en"
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (hasNameEn || hasDescriptionEn || name_en || description_en) {
      ops.push(
        prisma.jurusan_translate.upsert({
          where: { id_jurusan_locale: { id_jurusan: id, locale: "en" } },
          update: {
            ...(hasNameEn || name_en
              ? { name: (name_en || "(no title)").slice(0, 191) }
              : {}),
            ...(hasDescriptionEn || description_en
              ? { description: description_en || null }
              : {}),
          },
          create: {
            id: randomUUID(),
            id_jurusan: id,
            locale: "en",
            name: (name_en || "(no title)").slice(0, 191),
            description: description_en || null,
          },
        })
      );
    }

    if (ops.length) await prisma.$transaction(ops);

    return json({ data: { id } });
  } catch (err) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "partner_id tidak valid (FK gagal)" },
        { status: 400 }
      );
    }
    if (err?.code === "P2025") return notFound();
    console.error(`PATCH /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to update jurusan" },
      { status: 500 }
    );
  }
}

/* ========= DELETE /api/jurusan/:id ========= */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id) return badRequest("id wajib disertakan");

    const deleted = await prisma.jurusan.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return json({ data: deleted });
  } catch (err) {
    if (err?.code === "P2025") return notFound();
    console.error(`DELETE /api/jurusan/${params?.id} error:`, err);
    return NextResponse.json(
      { message: "Failed to delete jurusan" },
      { status: 500 }
    );
  }
}
