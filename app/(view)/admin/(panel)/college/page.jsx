// app/(view)/admin/college/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useCollegeAViewModel from "./useCollegeAViewModel";

const CollegeAContentLazy = lazy(() => import("./CollegeAContent"));

export default function CollegePage() {
  const vm = useCollegeAViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <CollegeAContentLazy vm={vm} />
    </Suspense>
  );
}
