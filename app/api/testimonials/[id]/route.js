import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return admin;
}

function pickLocaleParam(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5);
  } catch {
    return "id";
  }
}

// PUBLIC: detail (ikut locale & fallback 'id')
export async function GET(req, { params }) {
  const { id } = params;
  const locale = pickLocaleParam(req);

  const item = await prisma.testimonials.findUnique({ where: { id } });
  if (!item || item.deleted_at) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // ambil translate utk locale & fallback 'id'
  const tr = await prisma.testimonials_translate.findMany({
    where: {
      id_testimonials: id,
      locale: locale === "id" ? "id" : { in: [locale, "id"] },
    },
  });

  // pilih terbaik
  let picked =
    tr.find((t) => t.locale === locale) ||
    tr.find((t) => t.locale === "id") ||
    null;

  return NextResponse.json({
    id: item.id,
    photo_url: item.photo_url,
    created_at: item.created_at,
    updated_at: item.updated_at,
    name: picked?.name || null,
    message: picked?.message || null,
    locale: picked?.locale || null,
  });
}

// ADMIN: update photo_url + upsert terjemahan utk locale
export async function PUT(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const locale = (body.locale || "id").slice(0, 5);
    const photo_url =
      typeof body.photo_url === "string" ? body.photo_url.trim() : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const message =
      typeof body.message === "string" ? body.message.trim() : undefined;

    // pastikan induk ada & belum soft-deleted
    const base = await prisma.testimonials.findUnique({ where: { id } });
    if (!base || base.deleted_at) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // update parent bila perlu
    if (typeof photo_url !== "undefined") {
      await prisma.testimonials.update({
        where: { id },
        data: { photo_url },
      });
    }

    // upsert translate jika ada name/message
    if (typeof name !== "undefined" || typeof message !== "undefined") {
      const exist = await prisma.testimonials_translate.findFirst({
        where: { id_testimonials: id, locale },
      });

      if (exist) {
        await prisma.testimonials_translate.update({
          where: { id: exist.id },
          data: {
            ...(typeof name !== "undefined" ? { name } : {}),
            ...(typeof message !== "undefined" ? { message } : {}),
          },
        });
      } else {
        // butuh keduanya untuk create; kalau salah satu kosong, isi string kosong
        await prisma.testimonials_translate.create({
          data: {
            id_testimonials: id,
            locale,
            name: name ?? "",
            message: message ?? "",
          },
        });
      }
    }

    // kembalikan detail terbaru (pakai locale yg diminta, fallback 'id')
    const tr = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: id,
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });
    const picked =
      tr.find((t) => t.locale === locale) ||
      tr.find((t) => t.locale === "id") ||
      null;

    const latest = await prisma.testimonials.findUnique({ where: { id } });

    return NextResponse.json({
      id,
      photo_url: latest?.photo_url ?? null,
      name: picked?.name ?? null,
      message: picked?.message ?? null,
      locale: picked?.locale ?? null,
      updated_at: latest?.updated_at ?? new Date(),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PUT /testimonials/:id error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ADMIN: soft delete parent (translate tetap ada; query akan filter deleted_at)
export async function DELETE(_, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const deleted = await prisma.testimonials.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return NextResponse.json(deleted);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /testimonials/:id error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
