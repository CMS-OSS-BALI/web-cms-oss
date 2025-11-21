// app/api/users/route.js  (POST: create admin user)
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request) {
  // ⚠️ PERINGATAN:
  // Endpoint ini SEKARANG TIDAK LAGI BUTUH LOGIN / AUTH.
  // Artinya SIAPA PUN yang tahu URL-nya bisa bikin admin baru.
  // Pastikan hanya dipakai di local/dev, dan aktifkan lagi guard kalau sudah ke production.

  try {
    const body = await request.json();
    let { email, password } = body || {};

    // --- basic validation
    if (!email || !password) {
      return NextResponse.json(
        { message: "email dan password wajib diisi" },
        { status: 400 }
      );
    }

    email = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "format email tidak valid" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { message: "password minimal 8 karakter" },
        { status: 400 }
      );
    }

    // --- pre-check (tetap handle race lewat P2002 di catch)
    const existed = await prisma.admin_users.findUnique({ where: { email } });
    if (existed) {
      return NextResponse.json(
        { message: "email sudah terdaftar" },
        { status: 409 }
      );
    }

    // --- hash password
    const hashed = await bcrypt.hash(password, 10); // 12 jika ingin lebih kuat

    // --- create
    const user = await prisma.admin_users.create({
      data: { email, password: hashed },
      select: { id: true, email: true, created_at: true, updated_at: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (
      e?.code === "P2002" &&
      Array.isArray(e?.meta?.target) &&
      e.meta.target.includes("email")
    ) {
      return NextResponse.json(
        { message: "email sudah terdaftar" },
        { status: 409 }
      );
    }

    console.error("Create user error:", e);
    return NextResponse.json(
      { message: "internal server error" },
      { status: 500 }
    );
  }
}
