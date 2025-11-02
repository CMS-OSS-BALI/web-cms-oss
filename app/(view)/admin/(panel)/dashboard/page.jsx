// app/(view)/admin/dashboard/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useDashboardViewModel from "./useDashboardViewModel";

const DashboardContentLazy = lazy(() => import("./DashboardContent"));

export default function DashboardPage() {
  const vm = useDashboardViewModel();

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
