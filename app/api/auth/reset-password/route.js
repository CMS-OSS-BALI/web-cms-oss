// app/api/auth/reset-password/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const code = String(body?.code ?? "");
    const new_password = String(body?.new_password ?? "");

    if (!email || !code || !new_password) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { message: "Kode tidak valid" },
        { status: 400 }
      );
    }
    if (new_password.length < 8) {
      return NextResponse.json(
        { message: "Password minimal 8 karakter" },
        { status: 400 }
      );
    }

    const user = await prisma.admin_users.findUnique({ where: { email } });
    if (!user) {
      // jangan bocorkan detail
      return NextResponse.json(
        { message: "Token tidak valid" },
        { status: 400 }
      );
    }

    // hash kode sama seperti saat generate: sha256(`${user.id}:${code}`)
    const codeHash = crypto
      .createHash("sha256")
      .update(`${user.id}:${code}`)
      .digest("hex");
    const rec = await prisma.reset_password_tokens.findUnique({
      where: { token: codeHash },
    });

    if (!rec || rec.used_at || rec.admin_user_id !== user.id) {
      return NextResponse.json(
        { message: "Token tidak valid" },
        { status: 400 }
      );
    }
    if (rec.expires_at < new Date()) {
      await prisma.reset_password_tokens
        .delete({ where: { token: codeHash } })
        .catch(() => {});
      return NextResponse.json(
        { message: "Token kadaluarsa" },
        { status: 400 }
      );
    }

    const hashPwd = await bcrypt.hash(new_password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.admin_users.update({
        where: { id: user.id },
        data: { password: hashPwd, password_changed_at: new Date() },
      });
      await tx.reset_password_tokens.update({
        where: { token: codeHash },
        data: { used_at: new Date() },
      });
      // bersihkan token aktif lain milik user ini
      await tx.reset_password_tokens.deleteMany({
        where: {
          admin_user_id: user.id,
          used_at: null,
          token: { not: codeHash },
        },
      });
    });

    // === Auto-logout: hapus cookies NextAuth pada klien yang memanggil endpoint ===
    const res = NextResponse.json({ message: "Password berhasil diubah" });

    const cookieNames = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
      "next-auth.state",
    ];
    cookieNames.forEach((name) => {
      // hapus varian non-secure & secure
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
      res.cookies.set(name, "", { path: "/", maxAge: 0, secure: true });
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
