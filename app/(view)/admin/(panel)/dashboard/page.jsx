// app/(view)/admin/dashboard/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useDashboardViewModel from "./useDashboardViewModel";

const DashboardContentLazy = lazy(() => import("./DashboardContent"));

export default function DashboardPage() {
  // Hoist satu-satunya instance view model di sini
  const vm = useDashboardViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* Teruskan vm ke child agar tidak membuat instance kedua */}
      <DashboardContentLazy vm={vm} />
    </Suspense>
  );
}
