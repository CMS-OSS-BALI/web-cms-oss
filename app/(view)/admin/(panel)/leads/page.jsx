"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useLeadsViewModel from "./useLeadsViewModel";

const LeadsContentLazy = lazy(() => import("./LeadsContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function LeadsPage({ searchParams }) {
  const vm = useLeadsViewModel();

  // Set once from URL to avoid hydration mismatch (jaga2 jika nanti multi-locale)
  const initialLocale = pickLocale(searchParams?.lang);
  useEffect(() => {
    vm.setLocale?.(initialLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LeadsContentLazy vm={vm} />
    </Suspense>
  );
}
