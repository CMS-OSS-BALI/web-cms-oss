"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import { useAboutUsViewModel } from "./useAboutUsViewModel";

const AboutUsContentLazy = lazy(() => import("./AboutUsContent"));

export default function AboutUsPage() {
  const vm = useAboutUsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <AboutUsContentLazy {...vm} />
    </Suspense>
  );
}
