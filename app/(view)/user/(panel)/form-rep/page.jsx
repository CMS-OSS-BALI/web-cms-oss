"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

const FormRepContentLazy = lazy(() => import("./FormRepContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function FormRepPage() {
  const search = useSearchParams();
  const q = search?.get("lang") || "";

  const locale = useMemo(() => {
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [q]);

  // Persist pilihan lang bila datang dari query
  useEffect(() => {
    if (typeof window !== "undefined" && q) {
      localStorage.setItem("oss.lang", pickLocale(q, ""));
    }
  }, [q]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key agar remount saat ?lang berubah */}
      <FormRepContentLazy key={locale} locale={locale} />
    </Suspense>
  );
}
