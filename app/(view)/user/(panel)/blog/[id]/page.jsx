"use client";

import { Suspense, lazy, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useBlogDetailViewModel from "./useBlogDetailViewModel";

const BlogDetailContentLazy = lazy(() => import("./BlogDetailContent"));

const pickLocale = (q, ls) => {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function BlogDetailPage() {
  const params = useParams();
  const search = useSearchParams();

  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // fallback bahasa konten jika terjemahan tidak tersedia
  const fallback = "id";

  const vm = useBlogDetailViewModel({ locale, fallback });

  // Remount ketika id atau locale berubah
  const remountKey = `${params?.id || "x"}-${locale}`;

  return (
    <Suspense
      fallback={
        <div className="page-wrap" style={{ padding: "40px 0" }}>
          <Loading />
        </div>
      }
    >
      <BlogDetailContentLazy key={remountKey} {...vm} />
    </Suspense>
  );
}
