"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useRepresentativesViewModel from "./useRepresentativesViewModel";

const RepresentativesContentLazy = lazy(() =>
  import("./RepresentativesContent")
);

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function RepresentativesPage({ searchParams }) {
  const vm = useRepresentativesViewModel();

  // Set once from URL to avoid hydration mismatch
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
      <RepresentativesContentLazy vm={vm} />
    </Suspense>
  );
}
