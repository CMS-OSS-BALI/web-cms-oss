"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useMasterDataViewModel from "./useMasterDataViewModel";

const MasterDataContentLazy = lazy(() => import("./MasterDataContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function MasterDataPage({ searchParams }) {
  const vm = useMasterDataViewModel();
  const initialLocale = pickLocale(searchParams?.lang);

  useEffect(() => {
    vm.setLocale(initialLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

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
