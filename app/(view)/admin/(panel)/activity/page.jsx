// app/(view)/admin/activity/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useActivityViewModel from "./useActivityViewModel";

const ActivityContentLazy = lazy(() => import("./ActivityContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function ActivityPage({ searchParams }) {
  const vm = useActivityViewModel();
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
      <ActivityContentLazy vm={vm} />
    </Suspense>
  );
}
