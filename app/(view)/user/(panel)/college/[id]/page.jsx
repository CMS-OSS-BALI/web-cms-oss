"use client";

import { Suspense, lazy, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

const CollegeDetailContentLazy = lazy(() => import("./CollegeDetailContent"));

const pickLocale = (queryVal, navigatorLang) => {
  const v = (queryVal || navigatorLang || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function CollegeDetailPage() {
  const params = useParams();
  const search = useSearchParams();

  // Ambil ID saja dari [id]
  const identifier = useMemo(() => {
    const raw = params?.id ?? "";
    return Array.isArray(raw) ? String(raw[0] || "") : String(raw || "");
  }, [params]);

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") ?? search?.get("locale") ?? "";
    const nav = typeof navigator !== "undefined" ? navigator.language : "id";
    return pickLocale(fromQuery, nav);
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
