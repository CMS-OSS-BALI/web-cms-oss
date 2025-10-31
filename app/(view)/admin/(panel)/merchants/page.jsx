// app/(view)/admin/merchants/page.jsx
"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useMerchantsViewModel from "./useMerchantsViewModel";

const MerchantsContentLazy = lazy(() => import("./MerchantsContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function MerchantsPage({ searchParams }) {
  const vm = useMerchantsViewModel();
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
      <MerchantsContentLazy vm={vm} />
    </Suspense>
  );
}
