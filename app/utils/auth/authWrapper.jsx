"use client";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const PUBLIC = new Set([
  "/admin/login-page",
  "/forgot-password",
  "/reset-password",
]);

export default function AuthWrapper({ children }) {
  const { status } = useSession(); // "loading" | "authenticated" | "unauthenticated"
  const pathname = usePathname();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (status === "unauthenticated" && !PUBLIC.has(pathname)) {
      redirected.current = true;
      router.replace("/admin/login-page");
    }
  }, [status, pathname, router]);

  return children;
}
