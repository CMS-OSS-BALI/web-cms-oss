// app/(view)/admin/prodi/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useProdiViewModel from "./useProdiViewModel";

const ProdiContentLazy = lazy(() => import("./ProdiContent"));

export default function ProdiPage() {
  const vm = useProdiViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ProdiContentLazy vm={vm} />
    </Suspense>
  );
}
