"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useAboutUsViewModel from "./useAboutUsViewModel";

const AboutUsContentLazy = lazy(() => import("./AboutUsContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function AboutUsPage() {
  const search = useSearchParams();

  // Prefer ?lang= from URL, fallback to localStorage
  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // Persist selected locale for cross-page consistency
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  // Keep existing VM usage; pass props into lazy component
  const vm = useAboutUsViewModel({ locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key forces remount when ?lang= changes */}
      <AboutUsContentLazy key={locale} {...vm} />
    </Suspense>
  );
}
