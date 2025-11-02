// app/(view)/admin/activity/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useActivityViewModel from "./useActivityViewModel";

const ActivityContentLazy = lazy(() => import("./ActivityContent"));

export default function ActivityPage() {
  const vm = useActivityViewModel();

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
