// app/(view)/admin/dashboard/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useDashboardViewModel from "./useDashboardViewModel";

const DashboardContentLazy = lazy(() => import("./DashboardContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function DashboardPage({ searchParams }) {
  const vm = useDashboardViewModel();
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
      <DashboardContentLazy vm={vm} />
    </Suspense>
  );
}
