"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useJurusanViewModel from "./useJurusanViewModel";

const JurusanContentLazy = lazy(() => import("./JurusanContent"));

export default function JurusanPage() {
  const vm = useJurusanViewModel();
  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <JurusanContentLazy {...vm} />
    </Suspense>
  );
}
