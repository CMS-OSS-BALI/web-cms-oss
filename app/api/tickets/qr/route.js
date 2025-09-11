import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  if (!code)
    return NextResponse.json({ message: "code required" }, { status: 400 });

  const png = await QRCode.toBuffer(code, {
    width: 512,
    errorCorrectionLevel: "M",
  });
  return new NextResponse(png, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'inline; filename="ticket-qr.png"',
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=31536000",
    },
  });
}
