const PUBLIC_STORAGE_PREFIX = "cms-oss";
const EXTERNAL_PATTERN = /^(https?:|data:|blob:)/i;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function getClientStorageBase() {
  const raw = String(process.env.NEXT_PUBLIC_OSS_STORAGE_BASE_URL || "").trim();
  return trimTrailingSlash(raw);
}

export function computeClientPublicBase() {
  const base = getClientStorageBase();
  if (!base) return "";
  try {
    const url = new URL(base);
    const host = url.host.replace(/^storage\./, "cdn.");
    return `${url.protocol}//${host}`;
  } catch {
    return base;
  }
}

export function ensurePublicStorageKey(value, prefix = PUBLIC_STORAGE_PREFIX) {
  const clean = String(value || "").replace(/^\/+/, "");
  return clean.startsWith(`${prefix}/`) ? clean : `${prefix}/${clean}`;
}

export function toPublicStorageUrl(input, options = {}) {
  const { prefix = PUBLIC_STORAGE_PREFIX, allowRootRelative = false } = options;
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (EXTERNAL_PATTERN.test(raw)) return raw;
  if (allowRootRelative && raw.startsWith("/")) return raw;

  const key = ensurePublicStorageKey(raw, prefix);
  const base = computeClientPublicBase() || getClientStorageBase();
  if (!base) return `/${key}`;
  return `${base}/public/${key}`;
}

export function isExternalAsset(src) {
  return EXTERNAL_PATTERN.test(String(src || ""));
}

export { PUBLIC_STORAGE_PREFIX };
