"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useEnglishCViewModel from "./useEnglishCViewModel";

const EnglishCContentLazy = lazy(() => import("./EnglishCContent"));

/* ============ helpers ============ */
const normalizeLocale = (v = "") => {
  const s = String(v).slice(0, 2).toLowerCase();
  return s === "en" ? "en" : "id";
};

const readLangCookie = () => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )oss\.lang=(en|id)/);
  return m ? m[1] : "";
};

const writeLangCookie = (lang) => {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 180; // 180 days
  document.cookie = `oss.lang=${lang}; path=/; max-age=${maxAge}; samesite=lax`;
};

export default function EnglishCoursePage() {
  const search = useSearchParams();

  // read query params
  const qLang = search?.get("lang") || search?.get("locale") || "";
  const qType = search?.get("type") || search?.get("service_type") || "";

  // resolve locale priority: ?lang/?locale > localStorage > cookie > navigator
  const locale = useMemo(() => {
    let ls = "";
    if (typeof window !== "undefined") {
      try {
        ls = localStorage.getItem("oss.lang") || "";
      } catch {}
    }
    const ck = readLangCookie();
    const nav =
      typeof navigator !== "undefined" ? navigator.language || "" : "";
    return normalizeLocale(qLang || ls || ck || nav || "id");
  }, [qLang]);

  // persist chosen locale when query is present & set <html lang="">
  useEffect(() => {
    if (qLang) {
      try {
        localStorage.setItem("oss.lang", locale);
      } catch {}
      writeLangCookie(locale);
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", locale);
    }
  }, [qLang, locale]);

  // normalize service type
  const serviceType = useMemo(() => {
    const up = String(qType || "")
      .trim()
      .toUpperCase();
    return up === "B2B" || up === "B2C" ? up : undefined;
  }, [qType]);

  // build VM with the chosen locale (and optional service type)
  const vm = useEnglishCViewModel({ locale, serviceType });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* re-mount when locale or serviceType changes */}
      <EnglishCContentLazy
        key={`${locale}-${serviceType || "all"}`}
        {...vm}
        locale={locale}
      />
    </Suspense>
  );
}
