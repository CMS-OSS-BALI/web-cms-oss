// app/(view)/admin/programs/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useProgramsViewModel from "./useProgramsViewModel";

const ProgramsContentLazy = lazy(() => import("./ProgramsContent"));

export default function ProgramsPage() {
  const vm = useProgramsViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* ProgramsContent mengharapkan props flatten dari VM */}
      <ProgramsContentLazy {...vm} />
    </Suspense>
  );
}
