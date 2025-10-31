// app/api/supabase/download/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = process.env.SUPABASE_BUCKET;

function json(data, init) {
  return NextResponse.json(data, init);
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email && !session?.user?.id) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}

const baseName = (p = "") => String(p).split("/").pop() || "file";

export async function GET(req) {
  try {
    await assertAdmin(); // protect if needed

    if (!BUCKET) {
      return json(
        { error: { code: "SERVER_ERROR", message: "Bucket belum diset" } },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const path = String(searchParams.get("path") || "");
    const name = String(searchParams.get("name") || baseName(path));
    const ttl = Math.min(
      3600,
      Math.max(30, parseInt(searchParams.get("ttl") || "600", 10))
    ); // 30s - 1h

    if (!path) {
      return json(
        {
          error: { code: "BAD_REQUEST", message: "Parameter path wajib diisi" },
        },
        { status: 400 }
      );
    }

    // Signed URL with download hint
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, ttl, { download: true, downloadName: name });

    if (error || !data?.signedUrl) {
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "File tidak ditemukan atau akses ditolak.",
          },
        },
        { status: 404 }
      );
    }

    // Redirect ke signed URL
    return NextResponse.redirect(data.signedUrl, { status: 302 });
  } catch (err) {
    const status = err?.status || 500;
    if (status === 401) {
      return json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("GET /api/supabase/download error:", err);
    return json(
      { error: { code: "SERVER_ERROR", message: "Server error" } },
      { status: 500 }
    );
  }
}
