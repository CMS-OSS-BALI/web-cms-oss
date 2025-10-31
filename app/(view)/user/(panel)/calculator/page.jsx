"use client";

import { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useCalculatorViewModel from "./useCalculatorViewModel";

const CalculatorContentLazy = lazy(() => import("./CalculatorContent"));

const pickLocale = (q, ls) => {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function CalculatorPage() {
  const search = useSearchParams();

  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // VM dieksekusi di page agar props bisa dipass ke content
  const vm = useCalculatorViewModel({
    locale,
    fallback: locale === "id" ? "en" : "id",
  });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key=locale supaya remount ketika bahasa berubah */}
      <CalculatorContentLazy key={locale} locale={locale} {...vm} />
    </Suspense>
  );
}
