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

  // ===== Inject x-pathname ke REQUEST headers,
  // supaya bisa dibaca di server component via headers().get("x-pathname")
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const next = () =>
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

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
    return next();
  }

  // ===== Halaman admin (/admin/**)
  if (isAdminPage) {
    // login/forgot/reset tidak perlu token
    if (isPublicAdmin) return next();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/admin/login-page", req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }

    // Jika token mengandung flag forceReauth, paksa login ulang
    if (token.forceReauth) {
      const relogin = new URL("/admin/login-page", req.url);
      relogin.searchParams.set("reason", "relogin");
      const nextParam = searchParams.get("next") || pathname + search;
      if (nextParam) relogin.searchParams.set("next", nextParam);
      return NextResponse.redirect(relogin);
    }

    return next();
  }

  // Selain /admin/** dan /api/admin/**: public pages, tapi tetap kita kirim x-pathname
  return next();
}

// Sekarang middleware juga jalan untuk /user/** supaya x-pathname sampai ke PanelLayout
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/user/:path*"],
};
