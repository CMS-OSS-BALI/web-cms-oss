import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

async function getAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const admin = await prisma.admin_users.findUnique({ where: { email } });
  return admin || null;
}

// PUBLIC: list testimonials (belum dihapus)
export async function GET() {
  const data = await prisma.testimonials.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ data });
}

// ADMIN: create testimonial
export async function POST(req) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, photo_url, message } = await req.json().catch(() => ({}));
    if (!name || !photo_url || !message) {
      return NextResponse.json(
        { message: "name, photo_url, dan message wajib diisi" },
        { status: 400 }
      );
    }

    const created = await prisma.testimonials.create({
      data: {
        id: randomUUID(), // karena MySQL kolom id tidak punya default
        admin_user_id: admin.id, // FK ke admin pembuat
        name,
        photo_url,
        message,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /testimonials error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
