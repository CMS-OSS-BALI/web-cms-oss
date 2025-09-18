"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlastViewModel from "./useBlastViewModel";

const BlastContentLazy = lazy(() => import("./BlastContent"));

export default function Page() {
  const vm = useBlastViewModel();
  return (
    <Suspense fallback={<div className="page-wrap"><Loading /></div>}>
      <BlastContentLazy {...vm} />
    </Suspense>
  );
}
