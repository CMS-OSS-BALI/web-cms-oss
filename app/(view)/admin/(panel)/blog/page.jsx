"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlogViewModel from "./useBlogViewModel";

const BlogContentLazy = lazy(() => import("./BlogContent"));

export default function LeadsPage() {
  const vm = useBlogViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <BlogContentLazy {...vm} />
    </Suspense>
  );
}
