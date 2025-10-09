"use client";

import { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useAboutUsViewModel from "./useAboutUsViewModel";

const AboutUsContentLazy = lazy(() => import("./AboutUsContent"));

const pickLocale = (q, ls) => {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function AboutUsPage() {
  const search = useSearchParams();

  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  const vm = useAboutUsViewModel({ locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key ensures remount when ?lang changes */}
      <AboutUsContentLazy key={locale} {...vm} />
    </Suspense>
  );
}
