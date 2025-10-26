"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useProdiViewModel from "./useProdiViewModel";

const ProdiContentLazy = lazy(() => import("./ProdiContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function ProdiPage({ searchParams }) {
  const vm = useProdiViewModel();

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
      <ProdiContentLazy vm={vm} />
    </Suspense>
  );
}
