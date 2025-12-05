// middleware.js (root)
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Halaman admin yang boleh diakses tanpa login
const PUBLIC_ADMIN = new Set([
  "/admin/login-page",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

// API publik yang memang boleh diakses tanpa token (misal NextAuth callbacks, analytics track, swagger)
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/analytics/track",
  "/api/docs",
];

const API_SHARED_SECRET = (process.env.API_SHARED_SECRET || "").trim();

function hasPublicApiPrefix(pathname) {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function extractBearer(req) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

async function hasSessionOrToken(req) {
  // 1) API key/bearer secret
  const bearer = extractBearer(req);
  const xApiKey = (req.headers.get("x-api-key") || "").trim();
  if (API_SHARED_SECRET) {
    if (bearer && bearer === API_SHARED_SECRET) return true;
    if (xApiKey && xApiKey === API_SHARED_SECRET) return true;
  }

  // 2) NextAuth session (admin)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.forceReauth) return false;
  if (token?.sub || token?.email) return true;

  return false;
}

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;
  const search = req.nextUrl.search || "";

  // Enforce HTTPS in production (SEO-friendly 301) before hitting any routes
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
  const isHttp = proto === "http" || proto === "http:";
  if (process.env.NODE_ENV === "production" && isHttp) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isApi = pathname.startsWith("/api");
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

  // ===== API privat (/api/admin/**) -> harus session admin
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

  // ===== API umum: jika API_SHARED_SECRET disetel (prod), wajib bearer/x-api-key atau session admin
  if (isApi && API_SHARED_SECRET && !hasPublicApiPrefix(pathname)) {
    const ok = await hasSessionOrToken(req);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
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

  // Selain /admin/** dan /api/**: public pages, tapi tetap kita kirim x-pathname
  return next();
}

// Middleware berlaku ke seluruh /api (untuk gate bearer) + /admin + /user
export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/user/:path*"],
};
