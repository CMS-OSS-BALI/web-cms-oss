"use client";

import { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useDocumentTranslateViewModel from "./useDocumentTranslateViewModel";

const DocumentTranslateContentLazy = lazy(() =>
  import("./DocumentTranslateContent")
);

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function DocumentTranslatePage() {
  const search = useSearchParams();

  // Ambil dari ?lang= dulu, fallback ke localStorage, default "id"
  const locale = useMemo(() => {
    const q = search?.get("lang") || "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [search]);

  // Build view model sesuai locale
  const vm = useDocumentTranslateViewModel({ locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key memastikan remount saat ?lang= berubah */}
      <DocumentTranslateContentLazy key={locale} {...vm} locale={locale} />
    </Suspense>
  );
}
