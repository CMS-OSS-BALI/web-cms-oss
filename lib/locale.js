// src/lib/locale.js
const SUPPORTED = ["id", "en"];

function normalizeLocale(input) {
  if (!input) return "id";
  const lowered = String(input).toLowerCase();
  const base = lowered.split(/[-_]/)[0];
  if (SUPPORTED.includes(lowered)) return lowered;
  if (SUPPORTED.includes(base)) return base;
  return "id";
}

export function pickLocaleParam(req) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("locale");
    if (q) return normalizeLocale(q);

    const xLocale = req.headers.get("x-locale");
    if (xLocale) return normalizeLocale(xLocale);

    const accept = req.headers.get("accept-language");
    if (accept) {
      const first = accept.split(",")[0]?.trim();
      if (first) return normalizeLocale(first);
    }

    return "id";
  } catch {
    return "id";
  }
}
