"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useFormMitraViewModel from "./useFormMitraViewModel";
import FormMitraContent from "./FormMitraContent";

const pickLocale = (q, ls, nav) => {
  const v = (q || ls || nav || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function Page() {
  const search = useSearchParams();

  // Resolve locale: ?lang / ?locale -> localStorage(oss.lang) -> navigator -> "id"
  const locale = useMemo(() => {
    const q = search?.get("lang") ?? search?.get("locale") ?? "";
    const ls =
      typeof window !== "undefined"
        ? localStorage.getItem("oss.lang") || ""
        : "";
    const nav = typeof navigator !== "undefined" ? navigator.language : "id";
    return pickLocale(q, ls, nav);
  }, [search]);

  // Persist so header & halaman lain konsisten
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  const vm = useFormMitraViewModel({ locale });

  // key={locale} memastikan remount ringan ketika bahasa berubah via header/query
  return <FormMitraContent key={locale} locale={locale} {...vm} />;
}
