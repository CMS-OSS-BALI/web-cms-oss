// app/(view)/admin/services/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useServicesViewModel from "./useServicesViewModel";

const ServicesContentLazy = lazy(() => import("./ServicesContent"));

export default function ServicesPage() {
  const vm = useServicesViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ServicesContentLazy vm={vm} />
    </Suspense>
  );
}
