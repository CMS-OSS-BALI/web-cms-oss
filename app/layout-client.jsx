"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Halaman admin yang boleh diakses tanpa login
const PUBLIC_ADMIN = new Set([
  "/admin/login-page",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

function AdminGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession(); // ❗️jangan pakai { required: true } di global

  const isAdmin = pathname?.startsWith("/admin");
  const isPublicAdmin = PUBLIC_ADMIN.has(pathname);

  useEffect(() => {
    if (!isAdmin) return; // halaman publik → biarkan
    if (isPublicAdmin) return; // login/forgot/reset → biarkan
    if (status === "unauthenticated") {
      router.replace(`/admin/login-page?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAdmin, isPublicAdmin, status, router, pathname]);

  return children;
}

export default function LayoutClient({ children }) {
  return (
    <SessionProvider>
      <AdminGuard>
        <AntdRegistry>{children}</AntdRegistry>
      </AdminGuard>
    </SessionProvider>
  );
}
