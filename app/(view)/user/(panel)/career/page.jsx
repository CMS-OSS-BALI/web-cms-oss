"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useCareerViewModel from "./useCareerViewModel";

const CareerContentLazy = lazy(() => import("./CareerContent"));

export default function CareerPage() {
  const vm = useCareerViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <CareerContentLazy {...vm} />
    </Suspense>
  );
}
