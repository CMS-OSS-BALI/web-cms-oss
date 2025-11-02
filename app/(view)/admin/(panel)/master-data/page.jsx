// app/(view)/admin/master-data/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useMasterDataViewModel from "./useMasterDataViewModel";

const MasterDataContentLazy = lazy(() => import("./MasterDataContent"));

export default function MasterDataPage() {
  const vm = useMasterDataViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <MasterDataContentLazy vm={vm} />
    </Suspense>
  );
}
