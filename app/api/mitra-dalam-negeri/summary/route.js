// /app/api/mitra-dalam-negeri/summary/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ALLOWED = ["PENDING", "APPROVED", "DECLINED"];

export async function GET() {
  try {
    // target model yang benar sesuai schema baru
    const repo = prisma.mitra;

    if (!repo) {
      throw new Error(
        "Prisma model `mitra` tidak ditemukan. Cek export prisma di '@/lib/prisma'."
      );
    }

    const rows = await repo.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

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
