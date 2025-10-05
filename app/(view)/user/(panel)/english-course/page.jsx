"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useEnglishCViewModel from "./useEnglishCViewModel";

const EnglishCContentLazy = lazy(() => import("./EnglishCContent"));

export default function EnglishCoursePage() {
  const vm = useEnglishCViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <EnglishCContentLazy {...vm} />
    </Suspense>
  );
}
