// Lightweight, browser-first sanitizer wrapper
// No server-side jsdom dependency; falls back gracefully during SSR
import DOMPurify from "dompurify";

export function sanitizeHtml(html, options = {}) {
  const input = html == null ? "" : String(html);
  const {
    strip = false,
    allowedTags = [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "a",
      "br",
      "ul",
      "ol",
      "li",
      "p",
    ],
    allowedAttrs = ["href", "title", "target", "rel", "class", "style", "align"],
  } = options || {};

  const decode = (s) => {
    try {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const el = document.createElement("textarea");
        el.innerHTML = s;
        return el.value;
      }
      return s;
    } catch {
      return s;
    }
  };

  try {
    const canSanitize = typeof DOMPurify?.sanitize === "function";
    if (strip) {
      const decoded = decode(input);
      if (canSanitize) {
        return DOMPurify.sanitize(decoded, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      }
      return decoded.replace(/<[^>]*>/g, "");
    }
    if (canSanitize) {
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttrs,
      });
    }
    return decode(input);
  } catch {
    return input;
  }
}

export function stripHtml(html) {
  return sanitizeHtml(html, { strip: true });
}
