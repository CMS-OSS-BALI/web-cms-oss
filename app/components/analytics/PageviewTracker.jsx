"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Cookie helpers
function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}
function setCookie(name, val, maxAgeSec) {
  document.cookie = `${name}=${encodeURIComponent(
    val
  )}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}
function ensureIds() {
  let vid = getCookie("vid"); // 1 tahun
  if (!vid) {
    vid = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    setCookie("vid", vid, 60 * 60 * 24 * 365);
  }
  let sid = getCookie("sid"); // 30 menit idle
  if (!sid) sid = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  setCookie("sid", sid, 60 * 30);
  return { vid, sid };
}

export default function PageviewTracker({ ignoreAdmin = false }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (ignoreAdmin && pathname.startsWith("/admin")) return;

    const { vid, sid } = ensureIds();
    const payload = {
      path: pathname,
      referrer: document.referrer || "",
      visitor_id: vid,
      session_id: sid,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "text/plain" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
  }, [pathname, ignoreAdmin]);

  return null;
}
