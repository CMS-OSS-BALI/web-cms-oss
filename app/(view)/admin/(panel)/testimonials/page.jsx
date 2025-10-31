"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useTestimonialsViewModel from "./useTestimonialsViewModel";

const TestimonialsContentLazy = lazy(() => import("./TestimonialsContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function TestimonialsPage({ searchParams }) {
  const vm = useTestimonialsViewModel();
  const initialLocale = pickLocale(searchParams?.lang);

  useEffect(() => {
    vm.setLocale(initialLocale);
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
      <TestimonialsContentLazy vm={vm} />
    </Suspense>
  );
}
