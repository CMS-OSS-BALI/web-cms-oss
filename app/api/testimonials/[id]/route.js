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

// PUBLIC: detail
export async function GET(_, { params }) {
  const { id } = params;
  const item = await prisma.testimonials.findUnique({ where: { id } });
  if (!item || item.deleted_at) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

// ADMIN: update
export async function PUT(req, { params }) {
  try {
    await assertAdmin();
    const { id } = params;
    const { name, photo_url, message } = await req.json().catch(() => ({}));
    const updated = await prisma.testimonials.update({
      where: { id },
      data: { name, photo_url, message },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PUT /testimonials/:id error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ADMIN: soft delete
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
