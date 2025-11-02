// app/(view)/admin/events/representatives/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useRepresentativesViewModel from "./useRepresentativesViewModel";

const RepresentativesContentLazy = lazy(() =>
  import("./RepresentativesContent")
);

export default function RepresentativesPage() {
  const vm = useRepresentativesViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <RepresentativesContentLazy vm={vm} />
    </Suspense>
  );
}
