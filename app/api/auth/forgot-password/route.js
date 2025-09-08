// app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        { message: "Email wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.admin_users.findUnique({ where: { email } });

    // Selalu balas OK agar tidak bisa enumerate email
    if (!user) return NextResponse.json({ message: "OK" });

    // --- Anti-spam: tahan resend dalam N detik terakhir
    const cooldownSec = parseInt(
      process.env.RESET_TOKEN_RESEND_COOLDOWN_SECONDS || "60",
      10
    );
    if (cooldownSec > 0) {
      const recent = await prisma.reset_password_tokens.findFirst({
        where: {
          admin_user_id: user.id,
          created_at: { gt: new Date(Date.now() - cooldownSec * 1000) },
        },
        select: { id: true },
      });
      if (recent) {
        // tetap OK (jangan bocorkan) – user cukup tunggu cooldown
        return NextResponse.json({ message: "OK" });
      }
    }

    // Hapus token lama (biar hanya ada 1 aktif)
    await prisma.reset_password_tokens.deleteMany({
      where: {
        admin_user_id: user.id,
        OR: [{ used_at: null }, { expires_at: { lt: new Date() } }],
      },
    });

    // TTL 4-digit code: clamp 1–60 menit
    const rawTtl = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || "10", 10);
    const ttlMinutes = Math.max(1, Math.min(60, isNaN(rawTtl) ? 10 : rawTtl));
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // === 4 digit code ===
    const code = String(Math.floor(1000 + Math.random() * 9000)); // "1000"–"9999"
    const codeHash = crypto
      .createHash("sha256")
      .update(`${user.id}:${code}`)
      .digest("hex");

    await prisma.reset_password_tokens.create({
      data: {
        admin_user_id: user.id,
        token: codeHash, // simpan HASH, bukan plaintext
        expires_at: expiresAt,
      },
    });

    // Halaman input code
    const origin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    const resetPage = `${baseUrl}/reset-password?email=${encodeURIComponent(
      email
    )}`;

    // Kirim email (jika SMTP terkonfigurasi), jika tidak → log ke console
    try {
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });

        const fromAddress =
          process.env.MAIL_FROM ||
          (process.env.SMTP_USER
            ? `"OSS CMS" <${process.env.SMTP_USER}>`
            : `"OSS CMS" <no-reply@oss.local>`);

        await transporter.sendMail({
          from: fromAddress,
          to: email,
          subject: "Kode Reset Password OSS CMS",
          html: `
            <p>Kode verifikasi reset password kamu:</p>
            <div style="font-size:22px;font-weight:700;letter-spacing:2px">${code}</div>
            <p>Berlaku selama <b>${ttlMinutes} menit</b>.</p>
            <p>Masukkan kode di halaman berikut:</p>
            <p><a href="${resetPage}">${resetPage}</a></p>
            <p>Abaikan jika kamu tidak meminta.</p>
          `,
        });
      } else {
        console.log("[DEV] RESET CODE:", code, "| open:", resetPage);
      }
    } catch (mailErr) {
      // jangan bocorkan kegagalan kirim email ke klien
      console.error("[MAILER] gagal kirim:", mailErr?.message || mailErr);
    }

    return NextResponse.json({ message: "OK" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
