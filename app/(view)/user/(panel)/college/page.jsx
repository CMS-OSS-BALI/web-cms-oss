"use client";

import { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

const CollegeContentLazy = lazy(() => import("./CollegeContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function CollegePage() {
  const search = useSearchParams();

  // Ambil dari query ?lang= lebih dulu, fallback ke localStorage (client only)
  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key memastikan remount ketika ?lang= berubah */}
      <CollegeContentLazy key={locale} locale={locale} />
    </Suspense>
  );
}
