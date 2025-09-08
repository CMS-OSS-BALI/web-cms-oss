// app/api/merchants/route.js
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

export async function GET(req) {
  try {
    await assertAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("perPage") || "10", 10))
    );
    const includeDeleted = searchParams.get("includeDeleted") === "1";

    const where = {
      ...(includeDeleted ? {} : { deleted_at: null }),
      ...(q
        ? {
            OR: [
              { merchant_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { instagram: { contains: q, mode: "insensitive" } },
              { twitter: { contains: q, mode: "insensitive" } },
              { website: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.merchants.count({ where }),
      prisma.merchants.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      data,
    });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/merchants error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await assertAdmin();
    const body = await req.json();

    let {
      merchant_name,
      about = "",
      address = "",
      email = "",
      phone = "",
      instagram = "",
      twitter = "",
      website = "",
      mou_url = "",
      image_url = "", // ⬅️ NEW
    } = body || {};

    if (!merchant_name || String(merchant_name).trim() === "") {
      return NextResponse.json(
        { message: "merchant_name wajib diisi" },
        { status: 400 }
      );
    }

    const created = await prisma.merchants.create({
      data: {
        admin_user_id: admin.id,
        merchant_name: String(merchant_name).trim(),
        about: String(about),
        address: String(address),
        email: String(email),
        phone: String(phone),
        instagram: instagram ? String(instagram).trim() : null,
        twitter: twitter ? String(twitter).trim() : null,
        website: website ? String(website).trim() : null,
        mou_url: mou_url ? String(mou_url).trim() : null,
        image_url: image_url ? String(image_url).trim() : null, // ⬅️ NEW
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/merchants error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
