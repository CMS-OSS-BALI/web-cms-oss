// app/(view)/admin/blast/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlastViewModel from "./useBlastViewModel";

const BlastContentLazy = lazy(() => import("./BlastContent"));

export default function BlastPage() {
  const vm = useBlastViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* BlastContent menerima seluruh VM sebagai props root */}
      <BlastContentLazy {...vm} />
    </Suspense>
  );
}
