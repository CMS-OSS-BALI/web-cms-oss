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

// "use client";

// import { useEffect, useMemo } from "react";
// import { useSession } from "next-auth/react";
// import { usePathname, useRouter } from "next/navigation";

// export default function AuthWrapper({ children }) {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const pathname = usePathname();

//   const authRoutes = useMemo(
//     () => [
//       "/",
//       "/register",
//       "/change-password",
//       "/reset-password",
//       "/free-placement-test",
//       "/free-placement-test/result",
//       "/free-mock-test",
//       "/free-mock-test/result",
//       "/register-group-class",
//     ],
//     []
//   );

//   const shouldProtect = useMemo(() => {
//     return !authRoutes.some((route) => {
//       const regex = new RegExp(`^${route}(/.*)?$`);
//       return regex.test(pathname || "/");
//     });
//   }, [authRoutes, pathname]);

//   useEffect(() => {
//     if (status === "loading") return;
//     if (shouldProtect && !session) {
//       router.push("/");
//     }
//   }, [session, status, router, shouldProtect]);

//   return <>{children}</>;
// }
