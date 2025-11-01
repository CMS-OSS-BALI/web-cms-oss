// app/(view)/admin/events/vouchers/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useVouchersViewModel from "./useVouchersViewModel";

/* ===== lazy content ===== */
const VouchersContentLazy = lazy(() => import("./VouchersContent"));

/* ===== locale helper ===== */
const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function VouchersPage({ searchParams = {} }) {
  const vm = useVouchersViewModel();

  // Set sekali dari URL (hindari mismatch antara server vs client)
  const initialLocale = pickLocale(searchParams.lang);
  useEffect(() => {
    vm.setLocale?.(initialLocale);
  }, [vm, initialLocale]);

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
