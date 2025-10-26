"use client";

import { Suspense, lazy, useEffect } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useBlogViewModel from "./useBlogViewModel";

const BlogContentLazy = lazy(() => import("./BlogContent"));

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function BlogPage({ searchParams }) {
  const vm = useBlogViewModel();

  // Set once from URL to avoid hydration mismatch
  const initialLocale = pickLocale(searchParams?.lang);
  useEffect(() => {
    vm.setLocale(initialLocale);
  }, [initialLocale]); // intentionally not adding `vm` to avoid re-run

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* pass as a single object, bukan spread */}
      <BlogContentLazy vm={vm} />
    </Suspense>
  );
}
