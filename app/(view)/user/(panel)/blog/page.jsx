"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import { useBlogUViewModel } from "./useBlogUViewModel";

const BlogUContentLazy = lazy(() => import("./BlogUContent"));

export default function BlogUPage() {
  const vm = useBlogUViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <BlogUContentLazy {...vm} />
    </Suspense>
  );
}
