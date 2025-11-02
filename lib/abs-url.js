// app/lib/abs-url.js

export function getBaseUrl() {
  // Priority: NEXT_PUBLIC_APP_URL → NEXTAUTH_URL → VERCEL_URL → localhost
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  // Normalize: remove trailing slashes
  return fromEnv.replace(/\/+$/, "");
}

export function abs(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, getBaseUrl()).toString();
}
