import { randomUUID } from "crypto";
import { cookies } from "next/headers";

const VISITOR_COOKIE = "oss.analytics.vid";
const SESSION_COOKIE = "oss.analytics.sid";
const VISITOR_TTL = 60 * 60 * 24 * 365; // 1 year
const SESSION_TTL = 60 * 30; // 30 minutes
const IS_PROD = process.env.NODE_ENV === "production";

function isValidId(val) {
  return typeof val === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(val);
}

function makeCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge,
  };
}

function newId() {
  return randomUUID().replace(/-/g, "");
}

export function ensureAnalyticsCookies(cookieStore) {
  if (!cookieStore) {
    throw new Error("cookieStore is required to ensure analytics cookies");
  }

  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!isValidId(visitorId)) {
    visitorId = newId();
  }

  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!isValidId(sessionId)) {
    sessionId = newId();
  }

  const cookiesToSet = [
    {
      name: VISITOR_COOKIE,
      value: visitorId,
      options: makeCookieOptions(VISITOR_TTL),
    },
    {
      name: SESSION_COOKIE,
      value: sessionId,
      options: makeCookieOptions(SESSION_TTL),
    },
  ];

  return { visitorId, sessionId, cookiesToSet };
}

export function readAnalyticsCookies() {
  const jar = cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  return {
    visitorId: isValidId(visitorId) ? visitorId : null,
    sessionId: isValidId(sessionId) ? sessionId : null,
  };
}
