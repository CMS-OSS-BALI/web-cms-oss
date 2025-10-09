"use client";

import { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useEnglishCViewModel from "./useEnglishCViewModel";

const EnglishCContentLazy = lazy(() => import("./EnglishCContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function EnglishCoursePage() {
  const search = useSearchParams();

  // Query takes precedence over localStorage; default to "id"
  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // Build VM with the chosen locale
  const vm = useEnglishCViewModel({ locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key forces remount when ?lang= changes */}
      <EnglishCContentLazy key={locale} {...vm} locale={locale} />
    </Suspense>
  );
}
