// app/(view)/admin/blog/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlogViewModel from "./useBlogViewModel";

const BlogContentLazy = lazy(() => import("./BlogContent"));

export default function BlogPage() {
  const vm = useBlogViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <BlogContentLazy vm={vm} />
    </Suspense>
  );
}
