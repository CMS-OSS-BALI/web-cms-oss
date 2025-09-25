"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useConsultantsViewModel from "./useConsultantsViewModel";

const ConsultantsContentLazy = lazy(() => import("./ConsultantsContent"));

export default function ConsultantsPage() {
  const vm = useConsultantsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ConsultantsContentLazy {...vm} />
    </Suspense>
  );
}
