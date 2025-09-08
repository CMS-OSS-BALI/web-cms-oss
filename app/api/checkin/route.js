import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    throw new Response("Unauthorized", { status: 401 });
  const admin = await prisma.admin_users.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!admin) throw new Response("Forbidden", { status: 403 });
  return true;
}

/* ================================================
   PUT /api/tickets/checkin
   Body: { code* }  // bisa ticket_code atau id
================================================ */
export async function PUT(req) {
  try {
    await assertAdmin();

    const b = await req.json();
    const code = (b?.code || "").trim();
    if (!code)
      return NextResponse.json(
        { message: "code is required" },
        { status: 400 }
      );

    const ticket = await prisma.tickets.findFirst({
      where: {
        deleted_at: null,
        OR: [{ id: code }, { ticket_code: code }],
      },
    });
    if (!ticket)
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );

    if (ticket.checkin_status === "CHECKED_IN") {
      return NextResponse.json(
        { message: "Already checked in", data: ticket },
        { status: 200 }
      );
    }

    const updated = await prisma.tickets.update({
      where: { id: ticket.id },
      data: {
        checkin_status: "CHECKED_IN",
        checked_in_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err?.status) return err;
    console.error("PUT /api/tickets/checkin error:", err);
    return NextResponse.json(
      { message: "Failed to check in" },
      { status: 500 }
    );
  }
}
