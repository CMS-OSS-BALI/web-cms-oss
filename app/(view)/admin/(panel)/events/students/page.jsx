// app/(view)/admin/events/students/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useStudentsViewModel from "./useStudentsViewModel";

const StudentsContentLazy = lazy(() => import("./StudentsContent"));

export default function StudentsPage() {
  const vm = useStudentsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <StudentsContentLazy vm={vm} />
    </Suspense>
  );
}
