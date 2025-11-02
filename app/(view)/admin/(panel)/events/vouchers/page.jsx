// app/(view)/admin/events/vouchers/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useVouchersViewModel from "./useVouchersViewModel";

const VouchersContentLazy = lazy(() => import("./VouchersContent"));

export default function VouchersPage() {
  const vm = useVouchersViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <VouchersContentLazy vm={vm} />
    </Suspense>
  );
}
