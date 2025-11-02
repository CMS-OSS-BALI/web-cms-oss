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
  const { pathname, searchParams } = req.nextUrl;
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
    if (token.forceReauth) {
      return NextResponse.json(
        { ok: false, error: "relogin_required" },
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

    // TANPA fetch ke /api/auth/pca:
    // Jika token mengandung flag forceReauth (di-set oleh JWT callback), paksa login ulang
    if (token.forceReauth) {
      const relogin = new URL("/admin/login-page", req.url);
      relogin.searchParams.set("reason", "relogin");
      // optional: bawa kembali halaman semula
      const next = searchParams.get("next") || pathname + search;
      if (next) relogin.searchParams.set("next", next);
      return NextResponse.redirect(relogin);
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
