// app/api/tickets/qr/route.js
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/* GET /api/tickets/qr?code=ABC123 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || "";
    if (!code) return new Response("code is required", { status: 400 });

    // PNG buffer
    const png = await QRCode.toBuffer(code, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 512,
    });

    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("QR gen error:", err);
    return new Response("QR error", { status: 500 });
  }
}
