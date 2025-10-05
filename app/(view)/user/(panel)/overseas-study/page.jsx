"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useOverseasViewModel from "./useOverseasViewModel";

const OverseasContentLazy = lazy(() => import("./OverseasContent"));

export default function OverseasPage() {
  const vm = useOverseasViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <OverseasContentLazy {...vm} />
    </Suspense>
  );
}
