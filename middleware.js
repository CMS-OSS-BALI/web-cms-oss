// middleware.js (root)
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Halaman admin yang boleh diakses tanpa login
const PUBLIC_ADMIN = new Set([
  "/admin/login-page",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export async function middleware(req) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search || "";

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAdmin = PUBLIC_ADMIN.has(pathname);

  // ===== API privat (/api/admin/**)
  if (isAdminApi) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ===== Halaman admin (/admin/**)
  if (isAdminPage) {
    // login/forgot/reset tidak perlu token
    if (isPublicAdmin) return NextResponse.next();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/admin/login-page", req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }

    // Opsional: paksa re-login jika password berubah
    try {
      const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
      const res = await fetch(`${base}/api/auth/pca`, {
        headers: { cookie: req.headers.get("cookie") ?? "" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const pcaDb = data?.pca ? Date.parse(data.pca) : 0;
        const pcaTok = token?.pca ? Date.parse(token.pca) : 0;
        if (pcaDb > pcaTok) {
          const relogin = new URL("/admin/login-page", req.url);
          relogin.searchParams.set("reason", "relogin");
          return NextResponse.redirect(relogin);
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.next();
  }

  // Selain /admin/** dan /api/admin/** tidak dijaga (public pages jalan bebas)
  return NextResponse.next();
}

// Batasi hanya ke rute admin
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
