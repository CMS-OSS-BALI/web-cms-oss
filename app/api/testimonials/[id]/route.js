import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* ================ Helpers ================ */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

function getLocaleFromReq(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("locale") || "id").slice(0, 5).toLowerCase();
  } catch {
    return "id";
  }
}

function trimOrUndefined(v, max = 255) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : "";
}

function parseStar(input) {
  if (input === undefined) return undefined; // khusus PUT
  if (input === null || input === "") return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 1 && i <= 5 ? i : null;
}

function normalizeYoutubeUrl(u) {
  if (u === undefined) return undefined;
  if (u === null || u === "") return null;
  try {
    const url = new URL(String(u).trim());
    if (!/^https?:/.test(url.protocol)) return null;
    return url.toString().slice(0, 255);
  } catch {
    return null;
  }
}

/* ================ GET (detail) ================ */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const locale = getLocaleFromReq(req);

    const item = await prisma.testimonials.findUnique({
      where: { id },
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        kampus_negara_tujuan: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (!item || item.deleted_at) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

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

    return NextResponse.json({
      data: {
        id: item.id,
        photo_url: item.photo_url,
        star: item.star ?? null,
        youtube_url: item.youtube_url ?? null,
        kampus_negara_tujuan: item.kampus_negara_tujuan ?? null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        name: picked?.name ?? null,
        message: picked?.message ?? null,
        locale: picked?.locale ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================ PUT (update) ================ */
export async function PUT(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const locale = (body.locale || "id").slice(0, 5).toLowerCase();

    const base = await prisma.testimonials.findUnique({ where: { id } });
    if (!base || base.deleted_at) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // parent fields
    const photo_url = trimOrUndefined(body.photo_url, 255);
    const star = parseStar(body.star);
    if (body.star !== undefined && star === null) {
      return NextResponse.json(
        { message: "star harus integer 1–5" },
        { status: 422 }
      );
    }
    const youtube_url = normalizeYoutubeUrl(body.youtube_url);
    const kampus_negara_tujuan =
      body.kampus_negara_tujuan === undefined &&
      body.campusCountry === undefined
        ? undefined
        : (body.kampus_negara_tujuan ?? body.campusCountry ?? "")
            .toString()
            .trim()
            .slice(0, 255);

    const parentPatch = {};
    if (photo_url !== undefined) parentPatch.photo_url = photo_url;
    if (star !== undefined) parentPatch.star = star; // null untuk kosongkan
    if (youtube_url !== undefined) parentPatch.youtube_url = youtube_url;
    if (kampus_negara_tujuan !== undefined)
      parentPatch.kampus_negara_tujuan = kampus_negara_tujuan || null;

    if (Object.keys(parentPatch).length) {
      await prisma.testimonials.update({ where: { id }, data: parentPatch });
    }

    // translation fields
    const name =
      typeof body.name === "string"
        ? body.name.trim().slice(0, 191)
        : undefined;
    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, 10000)
        : undefined;

    if (name !== undefined || message !== undefined) {
      const exist = await prisma.testimonials_translate.findFirst({
        where: { id_testimonials: id, locale },
      });
      if (exist) {
        await prisma.testimonials_translate.update({
          where: { id: exist.id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(message !== undefined ? { message } : {}),
          },
        });
      } else {
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

    // response terbaru
    const latest = await prisma.testimonials.findUnique({
      where: { id },
      select: {
        id: true,
        photo_url: true,
        star: true,
        youtube_url: true,
        kampus_negara_tujuan: true,
        updated_at: true,
      },
    });
    const trs = await prisma.testimonials_translate.findMany({
      where: {
        id_testimonials: id,
        locale: locale === "id" ? "id" : { in: [locale, "id"] },
      },
    });
    const picked =
      trs.find((t) => t.locale === locale) ||
      trs.find((t) => t.locale === "id") ||
      null;

    return NextResponse.json({
      data: {
        id,
        photo_url: latest?.photo_url ?? null,
        star: latest?.star ?? null,
        youtube_url: latest?.youtube_url ?? null,
        kampus_negara_tujuan: latest?.kampus_negara_tujuan ?? null,
        name: picked?.name ?? null,
        message: picked?.message ?? null,
        locale: picked?.locale ?? null,
        updated_at: latest?.updated_at ?? new Date(),
      },
    });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("PUT /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ================ DELETE (soft delete) ================ */
export async function DELETE(_req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const deleted = await prisma.testimonials.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return NextResponse.json({ data: deleted });
  } catch (e) {
    if (e?.message === "UNAUTHORIZED")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (e?.message === "FORBIDDEN")
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error("DELETE /api/testimonials/[id] error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
