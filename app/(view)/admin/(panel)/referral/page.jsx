// app/(view)/admin/referral/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useReferralViewModel from "./useReferralViewModel";

const ReferralContentLazy = lazy(() => import("./ReferralContent"));

export default function ReferralPage({ searchParams }) {
  const vm = useReferralViewModel();

  // Seed filter dari URL (jika ada)
  useEffect(() => {
    if (searchParams?.q) vm.setQ(String(searchParams.q));
    if (searchParams?.status)
      vm.setStatus(String(searchParams.status).toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ReferralContentLazy vm={vm} />
    </Suspense>
  );
}
