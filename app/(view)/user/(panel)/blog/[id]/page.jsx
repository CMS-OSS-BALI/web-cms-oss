"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlogDetailViewModel from "./useBlogDetailViewModel";

const BlogDetailContentLazy = lazy(() => import("./BlogDetailContent"));

export default function BlogDetailPage() {
  const vm = useBlogDetailViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap" style={{ padding: "40px 0" }}>
          <Loading />
        </div>
      }
    >
      <BlogDetailContentLazy {...vm} />
    </Suspense>
  );
}
