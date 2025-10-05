"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useLayananViewModel from "./useLayananViewModel";

const LayananContentLazy = lazy(() => import("./LayananContent"));

export default function LayananPage() {
  const vm = useLayananViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LayananContentLazy {...vm} />
    </Suspense>
  );
}
