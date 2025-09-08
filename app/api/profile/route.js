import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Auth helper: ambil admin dg kolom yang ADA di schema */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });

  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      password: true, // kolom password di schema kamu
      name: true, // ⬅️ kolom baru
    },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return { admin, session };
}

/** GET /api/profile */
export async function GET() {
  try {
    const { admin, session } = await requireAdmin();
    return NextResponse.json({
      name: admin.name ?? session?.user?.name ?? "Admin User",
      email: admin.email,
    });
  } catch (err) {
    if (err?.status) return err;
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { message: "Failed to load profile" },
      { status: 500 }
    );
  }
}

/** PATCH /api/profile[?action=password] */
export async function PATCH(req) {
  try {
    const { admin } = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const action = (searchParams.get("action") || "").toLowerCase();

    const body = await req.json().catch(() => ({}));

    // Ubah password
    if (action === "password") {
      const current_password = body?.current_password || "";
      const new_password = body?.new_password || "";

      if (!new_password || new_password.length < 6) {
        return NextResponse.json(
          { message: "Password baru minimal 6 karakter" },
          { status: 400 }
        );
      }
      if (!admin.password) {
        return NextResponse.json(
          { message: "Akun ini tidak mendukung ubah password." },
          { status: 400 }
        );
      }
      const ok = await bcrypt.compare(current_password, admin.password);
      if (!ok) {
        return NextResponse.json(
          { message: "Password saat ini salah" },
          { status: 400 }
        );
      }
      const newHash = await bcrypt.hash(new_password, 10);
      await prisma.admin_users.update({
        where: { id: admin.id },
        data: { password: newHash, updated_at: new Date() },
      });
      return NextResponse.json({ message: "Password berhasil diubah" });
    }

    // Update nama saja
    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 191) : "";
    if (!name) {
      return NextResponse.json(
        { message: "Nama wajib diisi" },
        { status: 400 }
      );
    }
    const updated = await prisma.admin_users.update({
      where: { id: admin.id },
      data: { name, updated_at: new Date() },
      select: { name: true, email: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err?.status) return err;
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
