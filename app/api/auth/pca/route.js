// app/api/auth/pca/route.js
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.admin_users.findUnique({
    where: { id: token.sub },
    select: { password_changed_at: true },
  });

  return NextResponse.json({
    pca: user?.password_changed_at
      ? user.password_changed_at.toISOString()
      : null,
  });
}
