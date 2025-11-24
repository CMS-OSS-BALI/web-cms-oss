"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageviewTracker({ ignoreAdmin = false }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (ignoreAdmin && pathname.startsWith("/admin")) return;

    const payload = {
      path: pathname,
      referrer: document.referrer || "",
    };

    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: "application/json" });

    // sendBeacon tidak selalu tersedia / dapat gagal; fallback ke fetch keepalive
    const sendWithFetch = () =>
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "include",
      }).catch(() => {});

    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon("/api/analytics/track", blob);
        if (!ok) sendWithFetch();
      } else {
        sendWithFetch();
      }
    } catch {
      sendWithFetch();
    }
  }, [pathname, ignoreAdmin]);

  return null;
}
