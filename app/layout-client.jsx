// app/layout-client.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

/**
 * Catatan:
 * - Proteksi /admin sudah dilakukan oleh middleware.js (matcher: /admin/** & /api/admin/**).
 * - Di sini cukup membungkus seluruh app dengan SessionProvider agar komponen
 *   yang butuh session bisa pakai useSession tanpa guard tambahan.
 * - Matikan refetch periodik agar tak ada request session berulang.
 */
export default function LayoutClient({ children }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchWhenHidden={false}
      refetchInterval={0}
    >
      <AntdRegistry>{children}</AntdRegistry>
    </SessionProvider>
  );
}
