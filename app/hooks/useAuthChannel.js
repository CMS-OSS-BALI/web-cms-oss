// app/hooks/useAuthChannel.js
"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

/**
 * Standarisasi broadcast logout antar-tab + aksi signOut.
 * - Kirim postMessage('logout') ke channel 'auth' sebelum signOut
 * - Dengarkan pesan 'logout' dari tab lain dan ikut signOut
 */
export default function useAuthChannel(opts = {}) {
  const callbackUrl = opts.callbackUrl || "/admin/login-page";
  const chRef = useRef(null);

  useEffect(() => {
    let ch;
    try {
      ch = new BroadcastChannel("auth");
      ch.onmessage = (ev) => {
        if (ev?.data === "logout") {
          signOut({ redirect: true, callbackUrl }).catch(() => {});
        }
      };
    } catch {
      // BroadcastChannel tidak tersedia (SSR / sandbox) → aman
    }
    chRef.current = ch;
    return () => ch?.close?.();
  }, [callbackUrl]);

  const onLogout = useCallback(async () => {
    try {
      chRef.current?.postMessage?.("logout");
    } catch {}
    await signOut({ redirect: true, callbackUrl });
  }, [callbackUrl]);

  return { onLogout };
}
