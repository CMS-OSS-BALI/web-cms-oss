"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import { useReferralViewModel } from "./useReferralViewModel";

const ReferralContentLazy = lazy(() => import("./ReferralContent"));

export default function ReferralPage() {
  const vm = useReferralViewModel();
  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ReferralContentLazy {...vm} />
    </Suspense>
  );
}
