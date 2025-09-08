// app/api/merchants/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

function buildUpdateData(payload) {
  const allow = [
    "merchant_name",
    "about",
    "address",
    "email",
    "phone",
    "instagram",
    "twitter",
    "website",
    "mou_url",
    "image_url", // ⬅️ NEW
  ];
  const data = {};
  for (const k of allow) {
    if (payload[k] !== undefined) {
      const v = payload[k];
      data[k] = v === null ? null : String(v);
    }
  }
  return data;
}

export async function GET(_req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    if (!id)
      return NextResponse.json({ message: "id kosong" }, { status: 400 });

    const merchant = await prisma.merchants.findUnique({ where: { id } });
    if (!merchant)
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(merchant);
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`GET /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, ctx) {
  return PATCH(req, ctx);
}

export async function PATCH(req, { params }) {
  try {
    await assertAdmin();

    const id = params?.id;
    const payload = await req.json();
    const data = buildUpdateData(payload);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "Tidak ada field yang diubah" },
        { status: 400 }
      );
    }

    const updated = await prisma.merchants.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`PATCH /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await assertAdmin();
    const id = params?.id;
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";
    const restore = searchParams.get("restore") === "1";

    if (hard && restore) {
      return NextResponse.json(
        { message: "Gunakan salah satu: hard=1 atau restore=1" },
        { status: 400 }
      );
    }

    if (restore) {
      const restored = await prisma.merchants.update({
        where: { id },
        data: { deleted_at: null },
      });
      return NextResponse.json(restored);
    }

    if (hard) {
      await prisma.merchants.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const deleted = await prisma.merchants.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return NextResponse.json(deleted);
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error(`DELETE /api/merchants/${params?.id} error:`, err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
