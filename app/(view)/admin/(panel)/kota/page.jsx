// app/(view)/admin/kota/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useKotaViewModel from "./useKotaViewModel";

const KotaContentLazy = lazy(() => import("./KotaContent"));

export default function KotaPage() {
  const vm = useKotaViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <KotaContentLazy vm={vm} initialLocale="id" />
    </Suspense>
  );
}
