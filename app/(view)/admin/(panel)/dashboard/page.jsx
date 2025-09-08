"use client";

import { Suspense, lazy } from "react";
import useDashboardViewModel from "./useDashboardViewModel";

const DashboardContentLazy = lazy(() => import("./DashboardContent"));

export default function Page() {
  const vm = useDashboardViewModel();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContentLazy {...vm} />
    </Suspense>
  );
}
