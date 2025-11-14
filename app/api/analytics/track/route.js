import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureAnalyticsCookies } from "@/lib/analytics/cookies";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { cookies } from "next/headers";

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
  const url = new URL(req.url);
  if (origin && origin !== url.origin) {
    return false;
  }
  if (!origin) {
    const referer = req.headers.get("referer");
    if (referer && !referer.startsWith(url.origin)) {
      return false;
    }
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

    const { visitorId, sessionId, cookiesToSet } =
      ensureAnalyticsCookies(cookies());
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
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
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
      return withAnalyticsCookies(
        NextResponse.json(
          { ok: false, error: "invalid_path" },
          { status: 400 }
        )
      );
    }

    const ua = req.headers.get("user-agent")?.slice(0, 250) ?? null;

    await prisma.analytics_pageviews.create({
      data: {
        path,
        referrer: sanitizeReferrer(body?.referrer),
        user_agent: ua,
        visitor_id: visitorId,
        session_id: sessionId,
      },
    });

    const resp = NextResponse.json({ ok: true });
    resp.headers.set("X-RateLimit-Remaining", String(limitMeta.remaining));
    resp.headers.set(
      "X-RateLimit-Reset",
      String(Math.floor(limitMeta.reset / 1000))
    );
    resp.headers.set("X-RateLimit-Limit", String(limitMeta.limit));
    return withAnalyticsCookies(resp);
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
