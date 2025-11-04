"use client";

import { Suspense, lazy, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

const CollegeDetailContentLazy = lazy(() => import("./CollegeDetailContent"));

const LANG_COOKIE = "oss.lang";

const normalizeLang = (v, fb = "id") => {
  const s = String(v || "")
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (s === "en") return "en";
  if (s === "id") return "id";
  return fb;
};

const readCookieLang = () => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)oss\.lang=(en|id)/);
  return m ? m[1] : "";
};

const readStorageLang = () => {
  if (typeof window === "undefined") return "";
  try {
    return (
      localStorage.getItem(LANG_COOKIE) ||
      sessionStorage.getItem(LANG_COOKIE) ||
      ""
    );
  } catch {
    return "";
  }
};

export default function CollegeDetailPage() {
  const params = useParams();
  const search = useSearchParams();

  // slug/id dari route segment
  const identifier = useMemo(() => {
    const raw = params?.id ?? "";
    return Array.isArray(raw) ? String(raw[0] || "") : String(raw || "");
  }, [params]);

  // Resolusi locale: query → cookie → storage → navigator → id
  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") ?? search?.get("locale") ?? "";
    const fromCookie = readCookieLang();
    const fromStorage = readStorageLang();
    const fromNav =
      typeof navigator !== "undefined" ? navigator.language : "id";
    return normalizeLang(fromQuery || fromCookie || fromStorage || fromNav);
  }, [search]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <CollegeDetailContentLazy id={identifier} locale={locale} />
    </Suspense>
  );
}
