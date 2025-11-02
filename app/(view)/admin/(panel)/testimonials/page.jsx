// app/(view)/admin/testimonials/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useTestimonialsViewModel from "./useTestimonialsViewModel";

const TestimonialsContentLazy = lazy(() => import("./TestimonialsContent"));

export default function TestimonialsPage() {
  const vm = useTestimonialsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <TestimonialsContentLazy vm={vm} />
    </Suspense>
  );
}
