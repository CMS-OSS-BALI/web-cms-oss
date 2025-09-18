"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import usePartnersViewModel from "./usePartnersViewModel";

const PartnersContentLazy = lazy(() => import("./PartnersContent"));

export default function PartnersPage() {
  const vm = usePartnersViewModel();
  return (
    <Suspense fallback={<div className="page-wrap"><Loading /></div>}>
      <PartnersContentLazy {...vm} />
    </Suspense>
  );
}
