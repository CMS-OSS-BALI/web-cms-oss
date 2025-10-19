"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

const OverseasContentLazy = lazy(() => import("./OverseasContent"));

function pickLocale(queryLang, storedLang) {
  const v = (queryLang || storedLang || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function OverseasPage() {
  const search = useSearchParams();

  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // Persist the chosen locale so subsequent pages can reuse it
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key forces remount when ?lang changes */}
      <OverseasContentLazy key={locale} locale={locale} />
    </Suspense>
  );
}
