// /app/api/mitra-dalam-negeri/summary/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// Sesuaikan salah satu import di bawah dengan setup-mu:
import { prisma } from "@/lib/prisma"; // ← umum
// import prisma from "@/lib/prisma";  // ← kalau default export

const ALLOWED = ["PENDING", "APPROVED", "DECLINED"];

export async function GET() {
  try {
    // Cari model yang tersedia di schema kamu
    const repo =
      prisma.merchantDomestic ||
      prisma.merchant ||
      prisma.merchants ||
      prisma.mitraDalamNegeri;

    if (!repo) {
      throw new Error(
        "Prisma model untuk mitra/merchant tidak ditemukan. Sesuaikan nama model di route ini."
      );
    }

    const rows = await repo.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    // Seed 0 untuk semua status yang diizinkan
    const base = Object.fromEntries(ALLOWED.map((s) => [s, 0]));
    for (const r of rows) {
      const key = String(r.status ?? "").toUpperCase();
      if (key in base) base[key] = r._count?._all ?? 0;
    }

    const summary = {
      pending: base.PENDING,
      approved: base.APPROVED,
      declined: base.DECLINED,
    };

    // Ikutkan juga di meta.counts agar kompatibel dengan VM kamu
    const meta = {
      total: Object.values(base).reduce((a, b) => a + b, 0),
      counts: { ...summary },
    };

    return NextResponse.json({ summary, meta }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err?.message || "Failed to build summary" } },
      { status: 500 }
    );
  }
}
