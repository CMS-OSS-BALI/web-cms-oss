"use client";

import { Suspense, lazy, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

// Lazy-load content component in the same folder: /rep/RepContent.jsx
const RepContentLazy = lazy(() => import("./EventsRContent"));

function pickLocale(q, ls) {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
}

export default function RepPage() {
  const search = useSearchParams();

  // read query once for side-effect (store to localStorage when present)
  const q = search?.get("lang") || "";

  // compute the active locale
  const locale = useMemo(() => {
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocale(q, ls);
  }, [q]);

  // persist chosen locale if query overrides it
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (q) localStorage.setItem("oss.lang", pickLocale(q, ""));
  }, [q]);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <RepContentLazy key={locale} locale={locale} />
    </Suspense>
  );
}
