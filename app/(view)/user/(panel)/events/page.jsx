"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";

/** Dynamic imports (lebih aman ketimbang react.lazy untuk Next) */
const EventsAll = dynamic(() => import("./EventsUContent"), {
  ssr: false,
  loading: () => <Loading />,
});
const EventsPeserta = dynamic(() => import("./peserta/EventsPContent"), {
  ssr: false,
  loading: () => <Loading />,
});
const EventsRep = dynamic(() => import("./rep/EventsRContent"), {
  ssr: false,
  loading: () => <Loading />,
});

/** locale helper */
const pickLocale = (q, ls) => {
  const v = (q || ls || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function EventsPage() {
  const search = useSearchParams();

  // support ?tab=all|peserta|rep tanpa menampilkan UI tab
  const tab = (search?.get("tab") || "all").toLowerCase();

  // locale: ?lang= > localStorage > default
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
      {tab === "peserta" ? (
        <EventsPeserta key={`peserta-${locale}`} locale={locale} />
      ) : tab === "rep" ? (
        <EventsRep key={`rep-${locale}`} locale={locale} />
      ) : (
        <EventsAll key={`all-${locale}`} locale={locale} />
      )}
    </Suspense>
  );
}
