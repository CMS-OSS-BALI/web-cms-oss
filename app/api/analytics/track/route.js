import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureAnalyticsCookies } from "@/lib/analytics/cookies";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function validatePath(path) {
  if (typeof path !== "string") return null;
  if (!path.startsWith("/")) return null;
  return path.slice(0, 250);
}

function sanitizeReferrer(referrer) {
  if (typeof referrer !== "string" || referrer.length === 0) return null;
  return referrer.slice(0, 250);
}

function sameOriginGuard(req) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") || new URL(req.url).protocol || "https";
  const expectedOrigin =
    host && proto ? `${proto}://${host}`.replace(/\/+$/, "") : null;

  // allow if Origin matches expected host (or url.origin as fallback)
  if (origin) {
    if (
      origin === expectedOrigin ||
      origin === new URL(req.url).origin ||
      (!expectedOrigin && origin === referer?.split("/", 3).slice(0, 3).join("/"))
    ) {
      return true;
    }
    console.warn("[analytics][track] origin mismatch", {
      origin,
      expectedOrigin,
      urlOrigin: new URL(req.url).origin,
    });
    return false;
  }

  // no Origin header: check referer host
  if (referer && expectedOrigin && !referer.startsWith(expectedOrigin)) {
    console.warn("[analytics][track] referer mismatch", {
      referer,
      expectedOrigin,
    });
    return false;
  }
  return true;
}

export async function POST(req) {
  try {
    if (!sameOriginGuard(req)) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    let visitorId, sessionId, cookiesToSet;
    try {
      ({ visitorId, sessionId, cookiesToSet } = ensureAnalyticsCookies(cookies()));
    } catch (err) {
      console.error("[analytics][track] ensure cookies failed", {
        message: err?.message,
      });
      return NextResponse.json(
        { ok: false, error: "cookie_error" },
        { status: 400 }
      );
    }
    const withAnalyticsCookies = (resp) => {
      for (const cookie of cookiesToSet) {
        resp.cookies.set({
          name: cookie.name,
          value: cookie.value,
          ...cookie.options,
        });
      }
      return resp;
    };

    const limitMeta = consumeRateLimit(
      `${visitorId}:${getClientIp(req)}`,
      {
        limit: 120,
        windowMs: 60_000,
      }
    );
    if (!limitMeta.success) {
      const resp = NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429 }
      );
      resp.headers.set(
        "Retry-After",
        String(Math.max(Math.ceil((limitMeta.reset - Date.now()) / 1000), 1))
      );
      resp.headers.set(
        "X-RateLimit-Reset",
        String(Math.floor(limitMeta.reset / 1000))
      );
      resp.headers.set("X-RateLimit-Limit", String(limitMeta.limit));
      resp.headers.set("X-RateLimit-Remaining", "0");
      return withAnalyticsCookies(resp);
    }

    let body = {};
    let rawPayload = "";
    const text = await req.text();
    rawPayload = text || "";
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (err) {
        console.warn("[analytics][track] invalid JSON payload", {
          message: err?.message,
          sample: text.slice(0, 200),
        });
        return withAnalyticsCookies(
          NextResponse.json(
            { ok: false, error: "invalid_payload" },
            { status: 400 }
          )
        );
      }
    }

    const path = validatePath(body?.path);
    if (!path) {
      console.warn("[analytics][track] invalid path", { path: body?.path });
      return withAnalyticsCookies(
        NextResponse.json(
          { ok: false, error: "invalid_path" },
          { status: 400 }
        )
      );
    }

    const ua = req.headers.get("user-agent")?.slice(0, 250) ?? null;

    try {
      await prisma.analytics_pageviews.create({
        data: {
          path,
          referrer: sanitizeReferrer(body?.referrer),
          user_agent: ua,
          visitor_id: visitorId,
          session_id: sessionId,
        },
      });
    } catch (err) {
      console.error("[analytics][track] failed to insert", {
        message: err?.message,
        code: err?.code,
        path,
      });
      return withAnalyticsCookies(
        NextResponse.json(
          { ok: false, error: "db_error" },
          { status: 500 }
        )
      );
    }

    const resp = NextResponse.json({ ok: true });
    resp.headers.set("X-RateLimit-Remaining", String(limitMeta.remaining));
    resp.headers.set(
      "X-RateLimit-Reset",
      String(Math.floor(limitMeta.reset / 1000))
    );
    resp.headers.set("X-RateLimit-Limit", String(limitMeta.limit));
    return withAnalyticsCookies(resp);
  } catch (e) {
    console.error("[analytics][track] unexpected error", {
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
