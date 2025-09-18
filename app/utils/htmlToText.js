// Convert HTML string to plain text without rendering raw tags
// Uses the browser DOM when available; falls back to a simple tag strip.
export function htmlToText(html) {
  if (html == null) return "";
  const input = String(html);
  try {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const el = document.createElement("div");
      el.innerHTML = input;
      return el.textContent || el.innerText || "";
    }
  } catch {}
  // Fallback: strip tags (not perfect, but safe as a last resort)
  return input.replace(/<[^>]*>/g, "");
}

