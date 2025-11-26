// app/api/admin/leads/summary/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/** Assert admin via next-auth (sama seperti endpoint lain) */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  return session.user;
}

/** Helper JSON sederhana (tanpa BigInt di sini karena kita hanya return angka kecil) */
const json = (data, init) => NextResponse.json(data, init);

export async function GET(req) {
  try {
    await assertAdmin();
  } catch {
    return json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Akses ditolak. Silakan login terlebih dahulu.",
        },
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  if (!Number.isFinite(year)) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Parameter year wajib angka (contoh: 2025).",
          field: "year",
        },
      },
      { status: 400 }
    );
  }

  // Rentang penuh tahun (UTC). Jika kolommu lokal time, tidak masalah untuk agregasi bulanan.
  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // Ambil agregat per bulan (MySQL) — cepat & hemat memori
  // Catatan: nama tabel = leads, kolom = created_at, assigned_to, deleted_at (ikuti schema-mu).
  const rowsAll = await prisma.$queryRaw`
    SELECT MONTH(created_at) AS m, COUNT(*) AS c
    FROM leads
    WHERE created_at BETWEEN ${from} AND ${to}
      AND deleted_at IS NULL
    GROUP BY m
  `;

  const rowsReps = await prisma.$queryRaw`
    SELECT MONTH(created_at) AS m, COUNT(*) AS c
    FROM leads
    WHERE created_at BETWEEN ${from} AND ${to}
      AND deleted_at IS NULL
      AND assigned_to IS NOT NULL
    GROUP BY m
  `;

  // Bentuk array 12 bulan (index 0..11)
  const allMonthly = new Array(12).fill(0);
  const repsMonthly = new Array(12).fill(0);

  for (const r of rowsAll) {
    const idx = Math.max(1, Number(r.m)) - 1; // MONTH() 1..12 → 0..11
    if (idx >= 0 && idx < 12) allMonthly[idx] = Number(r.c) || 0;
  }
  for (const r of rowsReps) {
    const idx = Math.max(1, Number(r.m)) - 1;
    if (idx >= 0 && idx < 12) repsMonthly[idx] = Number(r.c) || 0;
  }

  const allTotal = allMonthly.reduce((a, b) => a + b, 0);
  const repsTotal = repsMonthly.reduce((a, b) => a + b, 0);

  return json({
    year,
    leads: { total: allTotal, monthly: allMonthly },
    reps: { total: repsTotal, monthly: repsMonthly },
    meta: { from, to },
  });
}
