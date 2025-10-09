"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import { useLeadsUViewModel } from "./useLeadsUViewModel";

const LeadsUContentLazy = lazy(() => import("./LeadsUContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function LeadsUPage() {
  const search = useSearchParams();

  // Resolve locale from query (?lang=) then localStorage, default to "id"
  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // Persist the chosen locale so it becomes the fallback next time
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  const vm = useLeadsUViewModel(locale);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key ensures remount when ?lang= changes */}
      <LeadsUContentLazy key={locale} locale={locale} {...vm} />
    </Suspense>
  );
}
