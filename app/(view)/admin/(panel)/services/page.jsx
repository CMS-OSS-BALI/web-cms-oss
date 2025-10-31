"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useServicesViewModel from "./useServicesViewModel";

const ServicesContentLazy = lazy(() => import("./ServicesContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function ServicesPage({ searchParams }) {
  const vm = useServicesViewModel();

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
      <ServicesContentLazy vm={vm} />
    </Suspense>
  );
}
