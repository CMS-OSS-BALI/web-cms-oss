"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useMerchantsViewModel from "./useMerchantsViewModel";

const MerchantsContentLazy = lazy(() => import("./MerchantsContent"));

export default function MerchantsPage() {
  const vm = useMerchantsViewModel();
  return (
    <Suspense fallback={<div className="page-wrap"><Loading /></div>}>
      <MerchantsContentLazy {...vm} />
    </Suspense>
  );
}
