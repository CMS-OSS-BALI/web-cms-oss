"use client";

import { Suspense, lazy, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useConsultantDetailViewModel from "./useConsultantDetailViewModel";

/* Lazy-load the content component */
const ConsultantDetailContentLazy = lazy(() =>
  import("./ConsultantDetailContent")
);

/* Locale picker: prefer query (?locale or ?lang), then browser, default 'id' */
function pickLocale(q1, q2, browserLang) {
  const raw = (q1 || q2 || browserLang || "id").slice(0, 2).toLowerCase();
  return raw === "en" ? "en" : "id";
}

export default function ConsultantDetailPage() {
  const { id: rawId } = useParams(); // /user/landing-page/[id]
  const search = useSearchParams();

  // Normalize id to string just in case
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Compute locale once (avoids hydration mismatches)
  const locale = useMemo(() => {
    const browser =
      typeof navigator !== "undefined" ? navigator.language : "id";
    return pickLocale(search?.get?.("locale"), search?.get?.("lang"), browser);
  }, [search]);

  // If no id (unlikely), keep the loading UI
  if (!id) {
    return (
      <div className="page-wrap">
        <Loading />
      </div>
    );
  }

  const vm = useConsultantDetailViewModel({ id, locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key ensures content refreshes when id/locale change */}
      <ConsultantDetailContentLazy key={`${id}-${locale}`} {...vm} />
    </Suspense>
  );
}
