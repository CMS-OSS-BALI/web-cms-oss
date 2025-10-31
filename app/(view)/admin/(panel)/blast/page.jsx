// app/(view)/admin/blast/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlastViewModel from "./useBlastViewModel";

const BlastContentLazy = lazy(() => import("./BlastContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function BlastPage({ searchParams }) {
  const vm = useBlastViewModel();
  const initialLocale = pickLocale(searchParams?.lang);

  useEffect(() => {
    vm.setLocale?.(initialLocale);
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
      {/* BlastContent menerima seluruh VM sebagai props root,
          jadi tetap gunakan spread agar signature lama tidak rusak */}
      <BlastContentLazy {...vm} />
    </Suspense>
  );
}
