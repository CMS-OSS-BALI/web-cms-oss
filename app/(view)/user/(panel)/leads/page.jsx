"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import { useLeadsUViewModel } from "./useLeadsUViewModel";

const LeadsUContentLazy = lazy(() => import("./LeadsUContent"));

export default function LeadsUPage() {
  const vm = useLeadsUViewModel();
  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LeadsUContentLazy {...vm} />
    </Suspense>
  );
}
