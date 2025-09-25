"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useLeadsViewModel from "./useLeadsViewModel";

const LeadsContentLazy = lazy(() => import("./LeadsContent"));

export default function LeadsPage() {
  const vm = useLeadsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LeadsContentLazy {...vm} />
    </Suspense>
  );
}
