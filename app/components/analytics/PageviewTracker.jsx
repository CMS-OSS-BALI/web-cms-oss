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

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "same-origin",
      });
    }
  }, [pathname, ignoreAdmin]);

  return null;
}
