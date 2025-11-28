// app/(view)/admin/negara/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useNegaraViewModel from "./useNegaraViewModel";

const NegaraContentLazy = lazy(() => import("./NegaraContent"));

export default function NegaraPage() {
  const vm = useNegaraViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <NegaraContentLazy vm={vm} initialLocale="id" />
    </Suspense>
  );
}
