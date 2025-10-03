"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import { useLandingViewModel } from "./useLandingViewModel";

const LandingContentLazy = lazy(() => import("./LandingContent"));

export default function TestimonialsPage() {
  const vm = useLandingViewModel();
  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LandingContentLazy {...vm} />
    </Suspense>
  );
}
